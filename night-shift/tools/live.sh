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
		fi
		case "$out" in
			*"Not possible to fast-forward"*|*"local changes"*|*"would be overwritten"*)
				echo "  !! cannot pull: you have local edits to project files." >&2
				echo "     Keep them:   git stash" >&2
				echo "     Drop them:   git checkout -- ." >&2
				;;
		esac
		sleep "$EVERY"
	done
) &
PULL_PID=$!
trap 'kill $PULL_PID 2>/dev/null; echo; echo "stopped."; exit 0' INT TERM

"$ROJO" serve
kill $PULL_PID 2>/dev/null
