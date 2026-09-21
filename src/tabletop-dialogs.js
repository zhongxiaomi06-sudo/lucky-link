// Reuse the established semantic dialog contract; the 2D renderer owns its layout.
export const dialogs = `
      <dialog class="studio-dialog score-dialog" data-dialog="score" aria-labelledby="score-title">
        <header><h2 id="score-title">Score &amp; reward</h2><button type="button" data-close aria-label="Close score and reward">×</button></header>
        <p data-client-reaction>Made by you</p>
        <dl class="score-parts" data-score-parts></dl>
        <p class="score-tip" data-score-tip></p>
        <div class="reward-reveal" data-reward-reveal hidden></div>
      </dialog>

      <dialog class="studio-dialog" id="letters-dialog" data-dialog="levels" aria-labelledby="levels-title">
        <header><h2 id="levels-title">Your letters</h2><button type="button" data-close aria-label="Close challenges">×</button></header>
        <div class="play-modes" role="group" aria-label="Play mode"><button type="button" data-play-mode="challenge" aria-pressed="true">Commissions</button><button type="button" data-play-mode="free" aria-pressed="false">Free DIY</button></div>
        <div class="letter-details"><small data-level-number>01 / 05 · For Mia</small><h3 data-letter-title>Ocean wish</h3><p data-level-brief>Blue, airy, a little playful.</p><div class="style-tags" data-style-tags></div></div>
        <ul class="requirement-list" data-requirements></ul><div class="level-list" data-level-list></div>
      </dialog>
      <dialog class="studio-dialog collection-dialog" data-dialog="collection" aria-labelledby="collection-title">
        <header><h2 id="collection-title">Your bead box</h2><button type="button" data-close aria-label="Close bead collection">×</button></header>
        <p data-builder-status>Choose your first piece</p><span data-selection-label hidden>All charms</span>
        <div class="category-row" role="group" aria-label="Filter materials"><button type="button" data-category="all" aria-pressed="true">All</button><button type="button" data-category="crystal" aria-pressed="false">Crystal</button><button type="button" data-category="color" aria-pressed="false">Color</button><button type="button" data-category="symbol" aria-pressed="false">Charms</button></div>
        <div class="material-rail" data-materials></div>
        <h3>Set aside</h3><p>Beads you return stay here. Tap one to thread it again.</p><div class="returned-list" data-returned-list></div>
      </dialog>
      <dialog class="studio-dialog" data-dialog="sequence" aria-labelledby="sequence-title">
        <header><h2 id="sequence-title">Threading order</h2><button type="button" data-close aria-label="Close threading order">×</button></header>
        <p>Pick a piece to move, replace or return to the box.</p><ol class="sequence-list" data-sequence></ol><button type="button" class="clear-chain" data-action="clear" disabled>Clear chain</button>
      </dialog>
      <dialog class="studio-dialog piece-dialog" data-dialog="piece" aria-labelledby="piece-title">
        <header><h2 id="piece-title" data-piece-title>Selected piece</h2><button type="button" data-close aria-label="Close piece editor">×</button></header>
        <div class="piece-actions"><button type="button" data-action="move-earlier">Move earlier</button><button type="button" data-action="move-later">Move later</button><button type="button" data-action="replace">Replace</button><button type="button" data-action="remove">Return to box</button></div>
      </dialog>
      <dialog class="studio-dialog" data-dialog="settings" aria-labelledby="settings-title">
        <header><h2 id="settings-title">Shop settings</h2><button type="button" data-close aria-label="Close shop settings">×</button></header>
        <p>Links saved here apply only to this browser. Export the configuration to use it in the app build.</p>
        <form data-shop-form>
          <label>Shop name<input name="shopName" maxlength="80" autocomplete="organization"></label>
          <label>Shop link<input name="shopUrl" type="url" placeholder="https://" inputmode="url"></label>
          <label>Custom-order link<input name="customUrl" type="url" placeholder="https://" inputmode="url"></label>
          <label>Material<select name="materialId" data-link-material></select></label>
          <label>Material product link<input name="materialUrl" type="url" placeholder="https://" inputmode="url"></label>
          <p class="form-status" data-shop-status role="status"></p>
          <div class="dialog-actions"><button type="button" data-action="export-config">Export saved config</button><button type="submit">Save links</button></div>
        </form>
      </dialog>
      <dialog class="studio-dialog" data-dialog="customize" aria-labelledby="customize-title">
        <header><h2 id="customize-title">Make it yours</h2><button type="button" data-close aria-label="Close customization">×</button></header>
        <label>Design name<input data-custom-name maxlength="60" value="My lucky link"></label>
        <label>Cord color<select data-custom-cord><option value="slate">Slate blue</option><option value="ivory">Ivory</option><option value="rose">Rose</option></select></label>
        <label>Note for the maker<textarea data-custom-note maxlength="400" rows="2" placeholder="Fit, size or gift details"></textarea></label>
        <details><summary>Selected materials &amp; threading order</summary><pre data-order-text></pre><div class="material-shop-links" data-material-shop-links></div></details>
        <p class="shop-message" data-shop-message></p><div class="shop-links" data-shop-links></div>
        <p class="form-status" data-custom-status role="status">Copy or download your list before contacting the maker. Nothing is sent automatically.</p>
        <div class="dialog-actions"><button type="button" data-action="download-list">Download list</button><button type="button" data-action="copy-list">Copy list</button></div>
      </dialog>


`;
