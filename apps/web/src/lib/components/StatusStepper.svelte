<script lang="ts">
  export interface StepperStep {
    key: string;
    label: string;
    state: "done" | "current" | "upcoming";
  }

  interface Props {
    steps: StepperStep[];
    /** Optional terminal label rendered as a distinct badge when the current
     *  state is off-path (e.g. "Lost", "Void"). Omit for normal flows. */
    terminalLabel?: string | null;
    /** Tone for the terminal badge: "warning" for lost/void, "success" for won */
    terminalTone?: "success" | "warning" | "neutral";
    /** data-testid on the <ol> */
    testId?: string;
  }

  let {
    steps,
    terminalLabel = null,
    terminalTone = "neutral",
    testId = "status-stepper"
  }: Props = $props();
</script>

<div class="stepper" data-testid={testId}>
  <ol class="stepper__track" aria-label="Status progression">
    {#each steps as step, i (step.key)}
      <li
        class="stepper__step stepper__step--{step.state}"
        aria-current={step.state === "current" ? "step" : undefined}
        data-step-key={step.key}
        data-step-state={step.state}
      >
        <span class="stepper__node" aria-hidden="true">
          {#if step.state === "done"}
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" class="stepper__icon">
              <circle cx="8" cy="8" r="7" fill="currentColor" />
              <path d="M4.5 8l2.5 2.5 4-4" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          {:else if step.state === "current"}
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" class="stepper__icon">
              <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="2" fill="white" />
              <circle cx="8" cy="8" r="3" fill="currentColor" />
            </svg>
          {:else}
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" class="stepper__icon">
              <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5" />
            </svg>
          {/if}
        </span>
        {#if i < steps.length - 1}
          <span class="stepper__connector" aria-hidden="true"></span>
        {/if}
        <span class="stepper__label">{step.label}</span>
      </li>
    {/each}
  </ol>

  {#if terminalLabel}
    <span
      class="stepper__terminal stepper__terminal--{terminalTone}"
      data-testid="stepper-terminal"
      role="status"
    >
      {terminalLabel}
    </span>
  {/if}
</div>

<style>
  .stepper {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .stepper__track {
    display: flex;
    align-items: center;
    list-style: none;
    margin: 0;
    padding: 0;
    gap: 0;
    flex-wrap: wrap;
  }

  .stepper__step {
    display: flex;
    align-items: center;
    gap: 0;
    position: relative;
  }

  .stepper__node {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .stepper__icon {
    width: 1.125rem;
    height: 1.125rem;
  }

  .stepper__connector {
    display: block;
    width: 2rem;
    height: 2px;
    background: var(--st-semantic-border-subtle);
    flex-shrink: 0;
  }

  .stepper__step--done .stepper__connector {
    background: var(--st-semantic-feedback-success);
  }

  .stepper__label {
    font-size: 0.75rem;
    font-weight: 500;
    white-space: nowrap;
    margin-left: 0.375rem;
    color: var(--st-semantic-text-muted);
  }

  /* done step: connector + icon + label in success color */
  .stepper__step--done .stepper__icon {
    color: var(--st-semantic-feedback-success);
  }
  .stepper__step--done .stepper__label {
    color: var(--st-semantic-feedback-success);
  }

  /* current step: primary color, slightly larger label */
  .stepper__step--current .stepper__icon {
    color: var(--st-semantic-action-primary);
  }
  .stepper__step--current .stepper__label {
    color: var(--st-semantic-text-primary);
    font-weight: 700;
  }

  /* upcoming step: muted */
  .stepper__step--upcoming .stepper__icon {
    color: var(--st-semantic-border-subtle);
  }

  /* Terminal badge */
  .stepper__terminal {
    display: inline-flex;
    align-items: center;
    padding: 0.125rem 0.625rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
    border: 1.5px solid transparent;
  }

  .stepper__terminal--warning {
    background: var(--st-semantic-feedback-warningSubtle, #fef9c3);
    color: var(--st-semantic-feedback-warning, #ca8a04);
    border-color: var(--st-semantic-feedback-warning, #ca8a04);
  }

  .stepper__terminal--success {
    background: var(--st-semantic-feedback-successSubtle, #dcfce7);
    color: var(--st-semantic-feedback-success);
    border-color: var(--st-semantic-feedback-success);
  }

  .stepper__terminal--neutral {
    background: var(--st-semantic-surface-subtle);
    color: var(--st-semantic-text-muted);
    border-color: var(--st-semantic-border-subtle);
  }
</style>
