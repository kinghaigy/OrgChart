const ONBOARDING_SEEN_KEY = 'orgchart:onboarding_seen:v1';

export function hasSeenOnboarding(): boolean {
  return localStorage.getItem(ONBOARDING_SEEN_KEY) === 'true';
}

export function setSeenOnboarding(): void {
  localStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
}

export function showOnboardingModal(): void {
  // If already open, do not duplicate
  if (document.querySelector('.onboarding-overlay')) return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay onboarding-overlay';

  const box = document.createElement('div');
  box.className = 'modal-box onboarding-box';

  box.innerHTML = `
    <div class="onboarding-header">
      <div class="onboarding-brand">
        <img src="/favicon.svg" alt="" width="36" height="36" />
        <h2>Welcome to Just Org Charts</h2>
      </div>
      <p class="onboarding-tagline">Who does what around here anyway?</p>
    </div>

    <div class="onboarding-body">
      <section class="onboarding-section">
        <h3>What is Just Org Charts?</h3>
        <p>
          Just Org Charts is a fast, local-only organisation chart builder that runs right in your browser.
          There are no fees, no subscriptions, no accounts, and no data uploaded to the cloud. All of your chart
          data, people, and responsibilities are stored directly on your computer in your browser's local storage.
        </p>
      </section>

      <section class="onboarding-section custom-notes">
        <h3>Why I Made This</h3>
        <p>I could only find basic diagramming tools and paid solutions with extensive features and integration into other enterprise grade software systems.</p>
        <p>I wanted a tool any small or medium sized team could use without friction and be fast. No logging in, no paywalls, no accounts.</p>
        <p>This comes with the disadvantage that there's no server storing your information. It lives ONLY in your browser on this computer and in the JSON file you export.</p>
        <p>Let me know on GitHub if you have any default roles or responsibilities you think should be included.</p>
        <p>Have fun!</p>
      </section>

      <section class="onboarding-section">
        <h3>Quick Instructions</h3>
        <ol class="onboarding-steps">
          <li>
            <strong>Add & Structure Roles:</strong> Type a title into the <em>Roles</em> panel on the right and press Enter.
            Drag any role card on the canvas onto another role to nest it beneath it, or onto the organisation icon at the top.
          </li>
          <li>
            <strong>Navigate the Canvas:</strong> Click and drag empty space on the canvas background to pan around. Use your
            mouse wheel to zoom in and out. Click <em>Fit all</em> or <em>Reset view</em> in the top bar anytime.
          </li>
          <li>
            <strong>Assign Responsibilities:</strong> Select a role on the chart, switch to the <em>Responsibilities</em> tab,
            and check off the tasks belonging to that role. You can filter by category tags or add your own custom responsibilities.
          </li>
          <li>
            <strong>Track Coverage:</strong> Click the organisation card at the top of the chart to view required tasks. Any
            responsibilities your business needs that are not covered by any role will be highlighted in red in the catalog.
          </li>
          <li>
            <strong>Assign People:</strong> Switch to the <em>People</em> tab to create team members or placeholder hires.
            Drag someone onto a role card to assign them. Click any person's name to view their complete deduplicated responsibilities list.
          </li>
          <li>
            <strong>Print & Export:</strong> Use <em>Export JSON</em> in the top bar to save backup files to your drive, and
            <em>Print</em> to generate a clean, one-page chart followed by detailed employee responsibility breakdowns.
          </li>
        </ol>
      </section>
    </div>

    <div class="onboarding-actions">
      <button type="button" class="onboarding-got-it-btn">Got it!</button>
    </div>
  `;

  overlay.appendChild(box);
  document.body.appendChild(overlay);

  function close() {
    setSeenOnboarding();
    overlay.remove();
    document.removeEventListener('keydown', handleKeyDown);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') close();
  }

  const gotItBtn = box.querySelector<HTMLButtonElement>('.onboarding-got-it-btn');
  gotItBtn?.addEventListener('click', close);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  document.addEventListener('keydown', handleKeyDown);
  gotItBtn?.focus();
}
