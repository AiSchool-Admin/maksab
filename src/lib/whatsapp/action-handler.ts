/**
 * Action Handler for WhatsApp AI Responder
 * Determines next actions based on classified intent and conversation stage
 */

export interface ActionResult {
  next_stage: string;
  should_stop: boolean;
  should_escalate: boolean;
  follow_up_delay_hours?: number;
}

const STAGE_TRANSITIONS: Record<string, Record<string, ActionResult>> = {
  initial_outreach: {
    positive: { next_stage: 'engaged', should_stop: false, should_escalate: false },
    negative: { next_stage: 'declined', should_stop: true, should_escalate: false },
    angry: { next_stage: 'opted_out', should_stop: true, should_escalate: false },
    question: { next_stage: 'engaged', should_stop: false, should_escalate: false },
    busy: { next_stage: 'follow_up', should_stop: false, should_escalate: false, follow_up_delay_hours: 24 },
    ready_to_signup: { next_stage: 'converting', should_stop: false, should_escalate: false },
    publish: { next_stage: 'converting', should_stop: false, should_escalate: false },
    want_human: { next_stage: 'escalated', should_stop: false, should_escalate: true },
    unknown: { next_stage: 'engaged', should_stop: false, should_escalate: false },
  },
  engaged: {
    positive: { next_stage: 'converting', should_stop: false, should_escalate: false },
    negative: { next_stage: 'declined', should_stop: true, should_escalate: false },
    angry: { next_stage: 'opted_out', should_stop: true, should_escalate: false },
    question: { next_stage: 'engaged', should_stop: false, should_escalate: false },
    busy: { next_stage: 'follow_up', should_stop: false, should_escalate: false, follow_up_delay_hours: 24 },
    ready_to_signup: { next_stage: 'converting', should_stop: false, should_escalate: false },
    publish: { next_stage: 'converting', should_stop: false, should_escalate: false },
    want_human: { next_stage: 'escalated', should_stop: false, should_escalate: true },
    unknown: { next_stage: 'engaged', should_stop: false, should_escalate: false },
  },
  converting: {
    positive: { next_stage: 'converted', should_stop: false, should_escalate: false },
    negative: { next_stage: 'declined', should_stop: true, should_escalate: false },
    angry: { next_stage: 'opted_out', should_stop: true, should_escalate: false },
    question: { next_stage: 'converting', should_stop: false, should_escalate: false },
    busy: { next_stage: 'follow_up', should_stop: false, should_escalate: false, follow_up_delay_hours: 12 },
    ready_to_signup: { next_stage: 'converted', should_stop: false, should_escalate: false },
    publish: { next_stage: 'converted', should_stop: false, should_escalate: false },
    want_human: { next_stage: 'escalated', should_stop: false, should_escalate: true },
    unknown: { next_stage: 'converting', should_stop: false, should_escalate: false },
  },
  follow_up: {
    positive: { next_stage: 'engaged', should_stop: false, should_escalate: false },
    negative: { next_stage: 'declined', should_stop: true, should_escalate: false },
    angry: { next_stage: 'opted_out', should_stop: true, should_escalate: false },
    question: { next_stage: 'engaged', should_stop: false, should_escalate: false },
    busy: { next_stage: 'declined', should_stop: true, should_escalate: false },
    ready_to_signup: { next_stage: 'converting', should_stop: false, should_escalate: false },
    publish: { next_stage: 'converting', should_stop: false, should_escalate: false },
    want_human: { next_stage: 'escalated', should_stop: false, should_escalate: true },
    unknown: { next_stage: 'follow_up', should_stop: false, should_escalate: false },
  },
};

/**
 * Determine the next action based on intent and current stage
 */
export function determineAction(intent: string, currentStage: string): ActionResult {
  const stageMap = STAGE_TRANSITIONS[currentStage] || STAGE_TRANSITIONS.initial_outreach;
  return stageMap[intent] || stageMap.unknown;
}
