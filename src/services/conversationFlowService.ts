// Conversation-flow agents: one agent that moves between states as the caller
// talks, instead of one prompt that has to cover everything.
//
// Why this exists at all: Retell's inbound webhook fires on the ring, before
// the caller has said a word, so the answering agent cannot be chosen by what
// they want — only by which number they rang. Switching by intent therefore has
// to happen *inside* the agent, which is what a flow is.
//
// Shape confirmed against live flows on this account rather than the docs:
// a flow is a global prompt plus nodes, each node carrying an instruction and
// a set of edges whose conditions are plain English the model evaluates.
import { retellService } from "./retellService";

export type NodeType =
  | "conversation"
  | "end"
  | "transfer_call"
  | "function"
  | "branch"
  | "extract_dynamic_variables";

/** Node types this editor can safely render and write back. */
export const EDITABLE_NODE_TYPES: NodeType[] = ["conversation", "end", "transfer_call"];

export interface FlowEdge {
  id: string;
  destination_node_id: string;
  transition_condition: { type: "prompt"; prompt: string };
}

export interface FlowNode {
  id: string;
  type: NodeType;
  instruction?: { type: "prompt" | "static_text"; text: string };
  edges?: FlowEdge[];
  display_position?: { x: number; y: number };
  /** transfer_call nodes carry where to send the caller. */
  transfer_destination?: { type: string; number?: string };
  // Anything we do not model (function tool_id, extract variables, …) is kept
  // verbatim so editing a flow built in Retell's dashboard cannot destroy it.
  [key: string]: unknown;
}

export interface ConversationFlow {
  conversation_flow_id: string;
  version?: number;
  global_prompt?: string;
  start_node_id?: string;
  start_speaker?: "agent" | "user";
  model_choice?: { type: string; model: string };
  nodes: FlowNode[];
  tools?: unknown[];
  kb_config?: { top_k?: number; filter_score?: number };
  default_dynamic_variables?: Record<string, string>;
  knowledge_base_ids?: string[];
  is_published?: boolean;
}

export function getFlow(flowId: string): Promise<ConversationFlow> {
  return retellService.raw<ConversationFlow>({
    path: `/get-conversation-flow/${encodeURIComponent(flowId)}`,
  });
}

export function createFlow(body: Partial<ConversationFlow>): Promise<ConversationFlow> {
  return retellService.raw<ConversationFlow>({
    path: "/create-conversation-flow",
    method: "POST",
    body,
  });
}

export function updateFlow(
  flowId: string,
  body: Partial<ConversationFlow>,
): Promise<ConversationFlow> {
  return retellService.raw<ConversationFlow>({
    path: `/update-conversation-flow/${encodeURIComponent(flowId)}`,
    method: "PATCH",
    body,
  });
}

// ---------- validation ----------

export interface FlowProblem {
  nodeId?: string;
  message: string;
}

/**
 * Checks a flow is actually answerable before it is saved.
 *
 * A caller hears silence or a dead end when a node points at something that
 * isn't there, so these are caught here rather than live on a call.
 */
export function validateFlow(flow: ConversationFlow): FlowProblem[] {
  const problems: FlowProblem[] = [];
  const ids = new Set(flow.nodes.map((n) => n.id));

  if (flow.nodes.length === 0) {
    problems.push({ message: "A flow needs at least one step." });
    return problems;
  }
  if (!flow.start_node_id) {
    problems.push({ message: "No starting step is set, so the agent would not know how to open." });
  } else if (!ids.has(flow.start_node_id)) {
    problems.push({ message: `The starting step "${flow.start_node_id}" does not exist.` });
  }

  const duplicates = flow.nodes.map((n) => n.id).filter((id, i, a) => a.indexOf(id) !== i);
  for (const id of new Set(duplicates)) {
    problems.push({ nodeId: id, message: `More than one step is called "${id}".` });
  }

  for (const node of flow.nodes) {
    for (const edge of node.edges ?? []) {
      if (!ids.has(edge.destination_node_id)) {
        problems.push({
          nodeId: node.id,
          message: `"${node.id}" sends the caller to "${edge.destination_node_id}", which does not exist.`,
        });
      }
      if (!edge.transition_condition?.prompt?.trim()) {
        problems.push({
          nodeId: node.id,
          message: `A route out of "${node.id}" has no condition, so the agent cannot tell when to take it.`,
        });
      }
    }
    const terminal = node.type === "end" || node.type === "transfer_call";
    if (!terminal && (node.edges ?? []).length === 0) {
      problems.push({
        nodeId: node.id,
        message: `"${node.id}" has no way out and does not end the call, so the caller would be stuck.`,
      });
    }
    if (node.type === "transfer_call" && !node.transfer_destination?.number) {
      problems.push({ nodeId: node.id, message: `"${node.id}" transfers the call but has no number.` });
    }
  }

  // A step nothing reaches is dead weight; worth saying, not worth blocking.
  const reachable = new Set<string>(flow.start_node_id ? [flow.start_node_id] : []);
  let grew = true;
  while (grew) {
    grew = false;
    for (const node of flow.nodes) {
      if (!reachable.has(node.id)) continue;
      for (const edge of node.edges ?? []) {
        if (!reachable.has(edge.destination_node_id) && ids.has(edge.destination_node_id)) {
          reachable.add(edge.destination_node_id);
          grew = true;
        }
      }
    }
  }
  for (const node of flow.nodes) {
    if (!reachable.has(node.id)) {
      problems.push({ nodeId: node.id, message: `Nothing leads to "${node.id}", so it will never be used.` });
    }
  }
  return problems;
}

/** A minimal switchboard: greet, branch on intent, end. */
export function starterFlow(name: string): Partial<ConversationFlow> {
  return {
    global_prompt:
      `You answer the telephone for ${name}. Be warm, brief and natural. ` +
      `Never invent information you have not been given.`,
    start_node_id: "greeting",
    start_speaker: "agent",
    model_choice: { type: "cascading", model: "gpt-4.1" },
    nodes: [
      {
        id: "greeting",
        type: "conversation",
        display_position: { x: 0, y: 0 },
        instruction: {
          type: "prompt",
          text: `Greet the caller, say you are answering for ${name}, and ask how you can help.`,
        },
        edges: [
          {
            id: "e-enquiry",
            destination_node_id: "enquiry",
            transition_condition: { type: "prompt", prompt: "The caller has a general question." },
          },
          {
            id: "e-done",
            destination_node_id: "goodbye",
            transition_condition: { type: "prompt", prompt: "The caller is finished or says goodbye." },
          },
        ],
      },
      {
        id: "enquiry",
        type: "conversation",
        display_position: { x: 320, y: 0 },
        instruction: {
          type: "prompt",
          text: "Answer the caller's question using what you know. If you do not know, say so plainly and offer to take a message.",
        },
        edges: [
          {
            id: "e-enquiry-done",
            destination_node_id: "goodbye",
            transition_condition: { type: "prompt", prompt: "The caller has what they needed, or is finished." },
          },
        ],
      },
      {
        id: "goodbye",
        type: "end",
        display_position: { x: 640, y: 0 },
        instruction: { type: "prompt", text: "Thank the caller warmly and end the call." },
        edges: [],
      },
    ],
  };
}
