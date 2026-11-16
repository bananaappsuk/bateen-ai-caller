import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import VoicePreview from "./VoicePreview";
import VoiceAvatar from "./VoiceAvatar";

// jsdom has no audio engine, so play() is stubbed and the component is checked
// on what it asks the browser to do.
let played: string[] = [];
let paused = 0;
beforeEach(() => {
  played = []; paused = 0;
  vi.spyOn(window.HTMLMediaElement.prototype, "play").mockImplementation(function (this: HTMLAudioElement) {
    played.push(this.src);
    return Promise.resolve();
  });
  vi.spyOn(window.HTMLMediaElement.prototype, "pause").mockImplementation(() => { paused += 1; });
});

const URL_A = "https://example.com/anthony.mp3";

describe("hearing a voice before choosing it", () => {
  it("plays the selected voice's own sample", async () => {
    const user = userEvent.setup();
    render(<VoicePreview url={URL_A} label="Anthony" />);
    await user.click(screen.getByRole("button", { name: /play anthony preview/i }));
    expect(played).toEqual([URL_A]);
  });

  it("stops when pressed again, rather than stacking playbacks", async () => {
    const user = userEvent.setup();
    render(<VoicePreview url={URL_A} label="Anthony" />);
    const btn = screen.getByRole("button");
    await user.click(btn);
    await user.click(screen.getByRole("button", { name: /stop anthony preview/i }));
    expect(paused).toBeGreaterThan(0);
  });

  it("is disabled for a voice with no sample", () => {
    render(<VoicePreview url={null} label="Nameless" />);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("says what it will do, for anyone not using a mouse", () => {
    render(<VoicePreview url={URL_A} label="Anthony" />);
    expect(screen.getByRole("button", { name: /play anthony preview/i })).toBeInTheDocument();
  });
});

describe("the avatar beside the picker", () => {
  it("shows the voice's own image", () => {
    const { container } = render(
      <VoiceAvatar voice={{ voice_id: "v1", voice_name: "Anthony", avatar_url: "https://example.com/a.png" }} />,
    );
    expect(container.querySelector("img")).toHaveAttribute("src", "https://example.com/a.png");
  });

  it("falls back to an icon when a voice has no image", () => {
    const { container } = render(<VoiceAvatar voice={{ voice_id: "v1", voice_name: "Anthony" }} />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("falls back when nothing is selected yet", () => {
    const { container } = render(<VoiceAvatar voice={null} />);
    expect(container.querySelector("svg")).toBeTruthy();
  });

  // A cloned voice is the same shape as a stock one, so one component serves both.
  it("works for a cloned voice", () => {
    const { container } = render(
      <VoiceAvatar voice={{ voice_id: "custom_voice_abc", voice_name: "Ravi Test Voice", voice_type: "custom", avatar_url: "https://example.com/c.png" }} />,
    );
    expect(container.querySelector("img")).toHaveAttribute("src", "https://example.com/c.png");
  });
});
