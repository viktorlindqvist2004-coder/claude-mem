#!/usr/bin/env bash
#
# live.sh — one command, then leave it alone.
#
# Two things run at once:
#
#   * a pull loop, so anything pushed to this branch lands on your disk within
#     a few seconds without you typing anything
#   * rojo serve, so anything on your disk lands in Studio within a second of
#     that
#
# Net effect: somebody pushes a change, and it is in your open Studio session
# about five seconds later. Nothing to click, nothing to download, and the same
# place file the whole time.
#
# Stop it with Ctrl-C.
#
set -uo pipefail
cd "$(dirname "$0")/.."

BRANCH="${BRANCH:-claude/night-shift-galleria-nordljus-xim9np}"
EVERY="${EVERY:-5}"
ROJO="${ROJO:-rojo}"

if ! command -v "$ROJO" >/dev/null 2>&1; then
	echo "rojo is not installed. Run:  rokit install" >&2
	exit 1
fi

echo "Night Shift — live"
echo "  branch   $BRANCH"
echo "  pulling  every ${EVERY}s"
echo

# The pull loop. --ff-only so it can never create a merge commit behind your
# back; if you have edited a file yourself it stops and says so rather than
# clobbering it.
(
	last=""
	while true; do
		out=$(git fetch origin "$BRANCH" 2>&1 && git merge --ff-only "origin/$BRANCH" 2>&1)
		head=$(git rev-parse --short HEAD 2>/dev/null)
		if [ "$head" != "$last" ]; then
			if [ -n "$last" ]; then
				echo
				echo "  ── updated to $head ────────────────────────────"
				git log -1 --format='  %s' HEAD
				echo "  Studio has it. For geometry changes: F9 -> Rebuild the mall."
				echo
			fi
			last="$head"
			# Say which build this is every time it moves, so the number in
			# the terminal and the number on screen can be compared.
			if [ -f src/shared/Build.luau ]; then
				grep -o 'Build.COMMIT = "[a-z0-9]*"' src/shared/Build.luau | head -1 | sed 's/^/  /'
			fi
		fi
		case "$out" in
			*"Not possible to fast-forward"*|*"local changes"*|*"would be overwritten"*|*"error:"*|*"fatal:"*)
				#[[
				#  Loud, and every time.
				#
				#  This used to print once and then sit quietly failing, which
				#  is how an afternoon goes by with new builds being pushed and
				#  none of them arriving. A sync that is not working has to be
				#  more obvious than a sync that is.
				#]]
				echo "" >&2
				echo "  ############################################################" >&2
				echo "  ##  NOT PULLING. You are stuck on $head." >&2
				echo "  ##  Nothing pushed since then is on this machine." >&2
				echo "  ##" >&2
				echo "  ##  Keep your edits:  git stash" >&2
				echo "  ##  Throw them away:  git checkout -- ." >&2
				echo "  ############################################################" >&2
				echo "" >&2
				;;
		esac
		sleep "$EVERY"
	done
) &
PULL_PID=$!
trap 'kill $PULL_PID 2>/dev/null; echo; echo "stopped."; exit 0' INT TERM

"$ROJO" serve
kill $PULL_PID 2>/dev/null
