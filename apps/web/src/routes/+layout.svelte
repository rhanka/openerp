<script lang="ts">
  import { t } from "$lib/i18n";

  const locale = "en";
  const navItems = [
    { href: "/admin/users", label: t(locale, "nav.users") },
    { href: "/admin/roles", label: t(locale, "nav.roles") },
    { href: "/admin/approvals", label: t(locale, "nav.approvals") },
    { href: "/admin/audit", label: t(locale, "nav.audit") },
    { href: "/admin/settings", label: t(locale, "nav.settings") }
  ];
</script>

<svelte:head>
  <title>OpenERP</title>
</svelte:head>

<div class="shell">
  <aside class="sidebar" aria-label="Primary">
    <a class="brand" href="/" aria-label="OpenERP home">
      <span class="brand-mark">O</span>
      <span>
        <strong>OpenERP</strong>
        <small>Foundation</small>
      </span>
    </a>
    <nav>
      {#each navItems as item}
        <a href={item.href}>{item.label}</a>
      {/each}
    </nav>
  </aside>

  <main class="content">
    <slot />
  </main>
</div>

<style>
  :global(*) {
    box-sizing: border-box;
  }

  :global(body) {
    margin: 0;
    font-family:
      Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    color: #17211b;
    background: #f5f7f5;
    letter-spacing: 0;
  }

  :global(a) {
    color: inherit;
    text-decoration: none;
  }

  :global(button),
  :global(input),
  :global(select) {
    font: inherit;
  }

  .shell {
    min-height: 100vh;
    display: grid;
    grid-template-columns: 236px minmax(0, 1fr);
  }

  .sidebar {
    background: #15231b;
    color: #eff7f1;
    padding: 18px 14px;
    display: flex;
    flex-direction: column;
    gap: 22px;
  }

  .brand {
    min-height: 46px;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .brand-mark {
    width: 34px;
    height: 34px;
    display: grid;
    place-items: center;
    border-radius: 6px;
    background: #78a88a;
    color: #0e1a13;
    font-weight: 800;
  }

  .brand strong,
  .brand small {
    display: block;
    line-height: 1.1;
  }

  .brand small {
    margin-top: 3px;
    color: #b8c9be;
    font-size: 0.78rem;
  }

  nav {
    display: grid;
    gap: 4px;
  }

  nav a {
    min-height: 38px;
    padding: 9px 10px;
    border-radius: 6px;
    color: #dbe8df;
    font-size: 0.94rem;
  }

  nav a:hover,
  nav a:focus-visible {
    background: #22372b;
    outline: none;
  }

  .content {
    min-width: 0;
    padding: 22px;
  }

  :global(.page) {
    max-width: 1180px;
    margin: 0 auto;
  }

  :global(.page-header) {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 18px;
  }

  :global(h1) {
    margin: 0;
    font-size: 1.65rem;
    line-height: 1.18;
    font-weight: 760;
  }

  :global(.lede) {
    margin: 6px 0 0;
    color: #536259;
    line-height: 1.45;
  }

  :global(.toolbar) {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
  }

  :global(.button) {
    min-height: 36px;
    padding: 8px 12px;
    border: 1px solid #b9c8bd;
    border-radius: 6px;
    background: #ffffff;
    color: #1d2b22;
    cursor: pointer;
  }

  :global(.button.primary) {
    border-color: #2d6a49;
    background: #2d6a49;
    color: #ffffff;
  }

  :global(.metric-grid) {
    display: grid;
    grid-template-columns: repeat(4, minmax(150px, 1fr));
    gap: 12px;
    margin-bottom: 18px;
  }

  :global(.panel),
  :global(.metric) {
    background: #ffffff;
    border: 1px solid #d8e1db;
    border-radius: 6px;
    box-shadow: 0 1px 2px rgb(20 34 26 / 0.04);
  }

  :global(.metric) {
    min-height: 92px;
    padding: 14px;
  }

  :global(.metric span) {
    display: block;
    color: #5a6a60;
    font-size: 0.78rem;
    text-transform: uppercase;
  }

  :global(.metric strong) {
    display: block;
    margin-top: 8px;
    font-size: 1.45rem;
  }

  :global(.panel) {
    overflow-x: auto;
  }

  :global(.panel-header) {
    min-height: 48px;
    padding: 12px 14px;
    border-bottom: 1px solid #d8e1db;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
  }

  :global(.panel-header h2) {
    margin: 0;
    font-size: 1rem;
  }

  :global(table) {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }

  :global(th),
  :global(td) {
    padding: 11px 14px;
    border-bottom: 1px solid #e5ebe7;
    text-align: left;
    vertical-align: top;
    overflow-wrap: anywhere;
    white-space: nowrap;
    font-size: 0.92rem;
  }

  :global(th) {
    color: #536259;
    font-size: 0.76rem;
    text-transform: uppercase;
    background: #f7faf8;
  }

  :global(.status) {
    display: inline-flex;
    align-items: center;
    min-height: 24px;
    padding: 2px 8px;
    border-radius: 999px;
    background: #e7f3ea;
    color: #23543a;
    font-size: 0.8rem;
  }

  :global(.stack) {
    display: grid;
    gap: 14px;
  }

  @media (max-width: 760px) {
    .shell {
      grid-template-columns: 1fr;
    }

    .sidebar {
      position: sticky;
      top: 0;
      z-index: 10;
      padding: 10px;
      gap: 10px;
    }

    nav {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    nav a {
      text-align: center;
      font-size: 0.82rem;
      padding: 8px 4px;
    }

    .content {
      padding: 14px;
    }

    :global(.page-header) {
      display: grid;
    }

    :global(.metric-grid) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    :global(table) {
      min-width: 640px;
    }

  }
</style>
