// What turns a script into a conversation.
//
// An agent used to get only whatever the user typed into one box, so how well
// it handled an interruption, an early answer or a change of mind came down to
// how much prompt-writing the user happened to know. This supplies the part
// that is the same every time -- how to behave on a telephone -- and leaves the
// user to write only what is theirs: who they are and what they want from the
// call.
//
// Modelled on the WhatsApp agent's core-rules-plus-playbook split, rewritten
// for voice. The differences matter: there is no markdown, no bullet list and
// no emoji out loud; the caller can interrupt; silence reads as a dropped call;
// and anything spelt out (numbers, emails, dates) has to be said the way a
// person would say it.

export const VOICE_CORE_RULES = `## How to speak
- One question at a time. Never stack two.
- Short sentences. This is speech, not writing — no bullet points, no headings, no emoji, no markdown.
- Acknowledge what they just said before moving on.
- Match their energy. A short answer gets a short reply.
- Never say a URL out loud unless they ask for it. Offer to text or email it instead.
- Say numbers, dates and times the way a person does: "the third of June", "oh seven nine…", "half past two".
- If you are interrupted, stop talking and listen. Do not finish your sentence.
- Never read out anything in brackets, never say a stage direction, never say your own name twice.

## What to do when you are unsure
- Never invent a price, a date, a policy or a name. If you do not know, say so plainly and offer to find out.
- If you did not hear something, ask them to repeat it once. If it happens again, offer another way.
- If asked whether you are a real person or AI, say so honestly and straight away.
- If they are distressed, angry, or ask for a human, stop handling it yourself and hand over.

## Who you are speaking to
- {{caller_known}} is "yes" when we have spoken to this number before, and {{caller_name}} is their name.
- When it is "yes" and you have a name, greet them by it once and do not ask who they are again.
- When it is "no", or the name is blank, treat them as new. Never guess at a name and never say
  the word "unknown" out loud.
- They may be ringing from a withheld number. If so you simply cannot tell who they are — ask,
  rather than saying anything about their number not showing unless they raise it.

## How to finish
- Always leave them with a clear next step. Never end vaguely.
- Confirm back anything you have taken down — a name, a number, a time — before you end.`;

export interface Playbook {
  id: string;
  label: string;
  /** What this playbook is for, shown under its name in the picker. */
  summary: string;
  body: string;
}

export const PLAYBOOKS: Playbook[] = [
  {
    id: "reception",
    label: "Reception",
    summary: "Answers the phone, works out what they need, deals with it or passes it on.",
    body: `## Your job on this call
- Greet them, say who you are answering for, and ask how you can help.
- Work out what they actually want before you start answering. Ask if it is not clear.
- Answer from what you know. If it is not something you can deal with, take a message or hand over.
- If they have rung before, use what you know about them rather than asking it all again.
- Before they go, make sure they know what happens next and when.`,
  },
  {
    id: "enquiries",
    label: "Enquiries",
    summary: "Fields questions about what you offer and captures who was asking.",
    body: `## Your job on this call
- Find out what they are enquiring about before you pitch anything.
- Answer their question first. Only then ask for their details.
- Collect, one at a time and only what you need: their name, the best number, and what they are interested in.
- Never re-ask something they have already told you on this call.
- If they are not interested, accept it the first time and close warmly. Do not try a second time.`,
  },
  {
    id: "bookings",
    label: "Bookings and callbacks",
    summary: "Takes a booking or arranges for someone to ring them back.",
    body: `## Your job on this call
- Establish what they want booked, then when suits them.
- Offer times rather than asking an open question. Two or three options, not a list.
- Read the details back before you confirm anything.
- If you cannot book it, arrange a callback instead and say roughly when.`,
  },
  {
    id: "support",
    label: "Support",
    summary: "Helps an existing customer with a problem, escalates when it matters.",
    body: `## Your job on this call
- Assume they are already a customer and that something is not working.
- Let them explain fully before you start solving. Do not interrupt with questions.
- Confirm you have understood the problem back to them before you offer a fix.
- Escalate straight away for anything to do with money, access, or a complaint.
- Tell them what will happen next and when, even if you solved it.`,
  },
  {
    id: "none",
    label: "No playbook",
    summary: "Just your own instructions, plus the speaking rules.",
    body: "",
  },
];

export const DEFAULT_PLAYBOOK = "reception";

export function playbookById(id: string | null | undefined): Playbook | undefined {
  return PLAYBOOKS.find((p) => p.id === id);
}

/** Marks the generated part so it can be stripped back off when editing. */
export const GENERATED_MARKER = "\n\n<!-- generated: voice rules -->\n";

/**
 * Builds the prompt Retell receives: the user's own words first, because that
 * is what makes this agent theirs, then the parts that are the same for every
 * telephone call.
 */
export function composePrompt(userPrompt: string, playbookId: string | null | undefined): string {
  const playbook = playbookById(playbookId);
  const parts = [userPrompt.trim()];
  if (playbook?.body) parts.push(playbook.body);
  parts.push(VOICE_CORE_RULES);
  return parts.filter(Boolean).join("\n\n");
}

/** Recovers just the user's own text from a composed prompt. */
export function decomposePrompt(stored: string): string {
  let text = stored;
  for (const p of PLAYBOOKS) {
    if (p.body && text.includes(p.body)) text = text.replace(p.body, "");
  }
  text = text.replace(VOICE_CORE_RULES, "");
  return text.trim();
}

/** Which playbook a stored prompt was built with, if any. */
export function detectPlaybook(stored: string): string {
  const found = PLAYBOOKS.find((p) => p.body && stored.includes(p.body));
  return found?.id ?? "none";
}
