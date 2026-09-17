import { mkdir, writeFile } from "node:fs/promises";

const username = "emmazhang-ai-sde";
const displayName = "Shuyang Zhang";
const outputPath = new URL("../generated/github-statistics.svg", import.meta.url);

const headers = {
  accept: "application/vnd.github+json",
  "user-agent": "emmazhang-ai-sde-profile-readme",
};

if (process.env.GITHUB_TOKEN) {
  headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
}

async function fetchJson(url) {
  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`GitHub API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function fetchAllRepos() {
  const repos = [];

  for (let page = 1; page <= 10; page += 1) {
    const batch = await fetchJson(
      `https://api.github.com/users/${username}/repos?type=owner&sort=updated&per_page=100&page=${page}`,
    );

    repos.push(...batch);

    if (batch.length < 100) break;
  }

  return repos;
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

function iconPath(name) {
  const paths = {
    star: "M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25zm0 2.445L6.615 5.5a.75.75 0 01-.564.41l-3.097.45 2.24 2.184a.75.75 0 01.216.664l-.528 3.084 2.769-1.456a.75.75 0 01.698 0l2.77 1.456-.53-3.084a.75.75 0 01.216-.664l2.24-2.183-3.096-.45a.75.75 0 01-.564-.41L8 2.694v.001z",
    fork: "M5 3.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm0 2.122a2.25 2.25 0 10-1.5 0v.878A2.25 2.25 0 005.75 8.5h1.5v2.128a2.251 2.251 0 101.5 0V8.5h1.5a2.25 2.25 0 002.25-2.25v-.878a2.25 2.25 0 10-1.5 0v.878a.75.75 0 01-.75.75h-4.5A.75.75 0 015 6.25v-.878zm3.75 7.378a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm3-8.75a.75.75 0 100-1.5.75.75 0 000 1.5z",
    repo: "M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z",
    people: "M5.5 3.5a2 2 0 100 4 2 2 0 000-4zM2 5.5a3.5 3.5 0 116.898.84 5.015 5.015 0 012.122 1.45.75.75 0 11-1.04 1.08A3.5 3.5 0 003.5 10.5a3.5 3.5 0 00-3.5 3.5.75.75 0 01-1.5 0 5 5 0 014.102-4.922A3.493 3.493 0 012 5.5zm10.5-2a.75.75 0 000 1.5 1.5 1.5 0 010 3 .75.75 0 000 1.5 2.5 2.5 0 012.5 2.5.75.75 0 001.5 0 4 4 0 00-2.334-3.636A3 3 0 0012.5 3.5z",
    code: "M6.22 4.72a.75.75 0 010 1.06L3.56 8.44l2.66 2.66a.75.75 0 11-1.06 1.06L1.97 8.97a.75.75 0 010-1.06l3.19-3.19a.75.75 0 011.06 0zm3.56 0a.75.75 0 011.06 0l3.19 3.19a.75.75 0 010 1.06l-3.19 3.19a.75.75 0 11-1.06-1.06l2.66-2.66-2.66-2.66a.75.75 0 010-1.06z",
    language: "M0 1.75A.75.75 0 01.75 1h14.5a.75.75 0 010 1.5H.75A.75.75 0 010 1.75zm0 12.5a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H.75a.75.75 0 01-.75-.75zM5.5 6.75a.75.75 0 000 1.5h5a.75.75 0 000-1.5h-5z",
  };

  return paths[name] || paths.repo;
}

function renderRow({ icon, label, value }, index) {
  const y = 54 + index * 34;
  const isLongValue = label === "Primary languages";
  const valueSize = isLongValue ? 16 : 18;

  return `<g>
  <path transform="translate(42 ${y - 17}) scale(1.3)" fill="#2da44e" fill-rule="evenodd" d="${iconPath(icon)}"/>
  <text x="82" y="${y}" class="label">${escapeXml(label)}</text>
  <text x="710" y="${y}" class="value" text-anchor="end" font-size="${valueSize}">${escapeXml(value)}</text>
</g>`;
}

function renderSvg(rows) {
  const body = rows.map(renderRow).join("\n\n");

  return `<svg width="760" height="250" viewBox="0 0 760 250" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="title desc">
<title id="title">GitHub Statistics</title>
<desc id="desc">GitHub statistics for ${escapeXml(username)} including stars, forks, repositories, followers, repositories with code, and primary languages.</desc>
<style>
svg {
  font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji;
}

.background {
  fill: rgb(255, 255, 255);
  stroke: rgb(216, 222, 228);
  stroke-width: 1px;
}

.label,
.value {
  fill: rgb(36, 41, 47);
  font-size: 18px;
}

.value {
  font-weight: 500;
}
</style>
<rect x="5" y="5" width="750" height="240" rx="8" class="background"/>
${body}
</svg>
`;
}

const [user, repos] = await Promise.all([
  fetchJson(`https://api.github.com/users/${username}`),
  fetchAllRepos(),
]);

const stars = repos.reduce((total, repo) => total + Number(repo.stargazers_count || 0), 0);
const forks = repos.reduce((total, repo) => total + Number(repo.forks_count || 0), 0);
const languages = [...new Set(repos.map((repo) => repo.language).filter(Boolean))];
const reposWithCode = repos.filter((repo) => repo.language).length;

const rows = [
  { icon: "star", label: "Stars", value: formatNumber(stars) },
  { icon: "fork", label: "Forks", value: formatNumber(forks) },
  { icon: "repo", label: "Public repositories", value: formatNumber(user.public_repos || repos.length) },
  { icon: "people", label: "Followers", value: formatNumber(user.followers || 0) },
  { icon: "code", label: "Repositories with code", value: formatNumber(reposWithCode) },
  { icon: "language", label: "Primary languages", value: languages.slice(0, 5).join(", ") || "N/A" },
];

await mkdir(new URL("../generated/", import.meta.url), { recursive: true });
await writeFile(outputPath, renderSvg(rows));

console.log(`Updated ${outputPath.pathname}`);
