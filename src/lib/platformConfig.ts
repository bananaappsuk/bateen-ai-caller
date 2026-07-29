// Single platform-wide Twilio number. Every AI Agent, Campaign, and WhatsApp
// Agent outbound call uses this — there is no per-user Twilio configuration,
// linking, or selection anywhere in the app. To change the number the whole
// platform dials from, change this one value.
export const PLATFORM_TWILIO_NUMBER = "+447576545787";
