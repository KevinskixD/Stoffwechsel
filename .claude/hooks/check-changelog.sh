#!/bin/bash
# PreToolUse-Hook (Bash): blockiert `firebase deploy` mit Hosting, solange die Versionshistorie
# (src/features/changelog/changelog.ts) nicht zum Code passt. Exit 2 = blockieren, stderr geht an Claude.

cmd=$(jq -r '.tool_input.command // ""')

# Nur Deploys, die Hosting enthalten (ohne --only wird alles deployt, also auch Hosting)
echo "$cmd" | grep -qE 'firebase[[:space:]]+deploy' || exit 0
if echo "$cmd" | grep -q -- '--only' && ! echo "$cmd" | grep -qE -- '--only[ =][^ ]*hosting'; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
CL=src/features/changelog/changelog.ts

pkg_version=$(jq -r '.version' package.json)
top_version=$(grep -m1 -oE "version: '[0-9]+\.[0-9]+\.[0-9]+'" "$CL" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')

problems=()

if [ "$pkg_version" != "$top_version" ]; then
  problems+=("Version in package.json ($pkg_version) und oberster Changelog-Eintrag ($top_version) stimmen nicht überein.")
fi

# Letzter Commit, der den Changelog angefasst hat
last=$(git log -1 --format=%H -- "$CL")
if [ -n "$last" ]; then
  committed=$(git diff --name-only "$last"..HEAD -- src public index.html firebase.json | grep -v "^$CL$")
else
  committed=$(git ls-files src public index.html firebase.json)
fi
uncommitted=$(git status --porcelain -- src public index.html firebase.json | awk '{print $2}' | grep -v "^$CL$")
changed=$(printf '%s\n%s\n' "$committed" "$uncommitted" | sed '/^$/d' | sort -u)

if [ -n "$changed" ]; then
  problems+=("Seit dem letzten Changelog-Eintrag gab es Änderungen, die noch nicht in der Versionshistorie stehen:
$(echo "$changed" | sed 's/^/  - /')")
fi

if [ ${#problems[@]} -gt 0 ]; then
  {
    echo "Deploy blockiert: Die Versionshistorie ist nicht aktuell."
    printf '%s\n' "${problems[@]}"
    echo
    echo "Bitte zuerst: (1) Version in package.json (und package-lock.json) erhöhen, (2) in $CL einen neuen Eintrag mit den für Anwender relevanten Änderungen voranstellen, (3) committen. Danach das Deploy erneut ausführen."
    echo "Falls die Änderungen rein intern sind (kein Anwendernutzen), den Changelog mit einem 'hinweis'-Eintrag trotzdem fortschreiben oder den Nutzer fragen."
  } >&2
  exit 2
fi
exit 0
