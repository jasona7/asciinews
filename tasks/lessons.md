# Lessons

Rules written for myself after each cycle. Review before starting a news refresh.

## The tape's frame goes stale before its facts do
The most damaging error is never a wrong number — it's a wrong *tense*. On 2026-07-10 the site still
read "PRE-BELL / US-CASH-REOPENS-TODAY-13:30-UTC" for a session that had already opened, run and closed.
Every individual figure under that banner was defensible; the banner made all of them lies.

**Rule:** before touching any figure, ask what has *happened* since the last stamp — sessions opened,
matches played, funerals held, votes taken. Re-frame first, then re-number.

## Never publish a schedule from a single snippet
A source asserted all four World Cup quarterfinals were played Thursday. Only one was. Trusting it would
have meant inventing three scorelines. A second pass (ESPN game IDs, a FOX pre-match boxscore with *no
score*, Sky Sports' preview) proved the other three were still unplayed.

**Rule:** a claim that an event *happened* needs a source showing the *result*, not a source showing the
fixture. "No score on the boxscore" is positive evidence it hasn't been played.

## Verify the verification
`env -u FINNHUB_API_KEY npx next dev` looks like it tests the fallback path. It does not — Next loads
`.env.local` from disk regardless of the shell environment, and the route happily served `source:
finnhub`. The correct incantation is `FINNHUB_API_KEY="" npx next dev`: dotenv won't override a key
already present in `process.env`, so the empty string survives the load and trips
`if (!process.env.FINNHUB_API_KEY)`.

**Rule:** assert on the *response* (`source === 'fallback'`), never on how the process was launched.
A test that cannot fail is not a test. This applies beyond this repo: any "I disabled X" check must
prove X is disabled from the output, not from the command line.

## Take one atomic snapshot, never stitch polls
Binance's daily candle rolls at 00:00 UTC. Running a refresh at exactly 00:00 UTC, three polls nine
minutes apart reported BTC at +1.51%, +1.66%, +1.59% while the *price* moved about $40 — `o`/`pc` were
resetting underneath. Mixing a price from one poll with a percentage from another publishes a number
that never existed.

**Rule:** fetch all quotes in one pass, assert they share a single `t`, and use that snapshot whole.

## A rejected source is not a wrong source forever
The prior cycle reasoned CompaniesMarketCap's NVDA cap must be wrong because it didn't reconcile with a
reported Apple gap, and published ~$4.74T instead. This cycle Finnhub `profile2` ($4.907T) and CMC
($4.911T) agreed *independently*, and both reconciled against shares × close. The earlier rejection
propagated an understated figure for a full day.

**Rule:** prefer a figure you can *reconstruct* (shares × price) over one you can only cross-reference.
When two sources disagree, look for a third that is derivable from primitives, and re-test rejected
sources on the next cycle rather than inheriting the verdict.

## Recirculated news is not new news
Yahoo surfaced "Microsoft launches $2.5B Frontier Company" on Jul 9; the body said the announcement was
Jul 2. Feed timestamps are *publication* times, not *event* times.

**Rule:** read the summary before dating a story by its `datetime` field. If the body contradicts the
timestamp, date it by the body or drop it.

## Reuters via Google News RSS carries no body
Those items arrive with the headline echoed as the `summary`. They can source a *direction* ("Nasdaq ends
sharply higher") but never a *level*. Numeric levels must come from a page actually fetched.

## Drop, don't restate
Every cycle inherits claims that can no longer be re-sourced (this time: the Dow record close, IMF
forecasts, Apple's "$30B" Broadcom figure). Restating them because they were true yesterday is how a
tape rots. The project rule is to drop them — and to say in the notes *which* were dropped and why, so
the next cycle doesn't quietly resurrect them.

*Postscript, 2026-07-10 12:00 UTC:* the "$30B Broadcom" figure dropped above is now **verified** on
Apple's own newsroom. Dropping was right; leaving it dropped forever would have been wrong. A dropped
claim is a claim awaiting a source, not a claim ruled false — re-test the whole DROPPED list each cycle,
exactly as the "rejected source" rule requires for rejected *numbers*.

## A subagent's "FRESH" is not evidence of freshness
Two of four recon agents this cycle handed back recirculated events labelled as overnight news. One
reported "Trump declared the ceasefire over" as the fresh risk-tone change — he said it **Wednesday Jul 8**
in Ankara. Another reported Tesla's Q2 deliveries as "FRESH (Jul 9), source: Motley Fool Jul 9" — Electrek
and the rest published the delivery report on **Jul 2**. Both agents were explicitly briefed with the
"publication time ≠ event time" rule and both still inherited a feed's timestamp.

**Rule:** the recirculation check does not delegate. Before any claim goes on the tape, find its *earliest*
publisher, not the outlet that surfaced it to your agent. A one-search check (`<claim> <date>`) catches
this in seconds, and it caught both here.

## An assertion that cannot fail is not an assertion (again)
The atomic-snapshot script printed `ATOMIC: YES` against four rows of `{"error":"Invalid API key"}` —
`[...new Set([])].length === 1` is false, so the check "passed" by collapsing to an empty set. The previous
cycle wrote this same lesson about a *fallback* test; it recurred one layer down, in the test's own guard.

**Rule:** guard on data presence *before* asserting on data shape. Assert `every(q => q.c > 0)` and
`t` non-null first, then compare timestamps. Then test the guard: run it once against a deliberately
broken input and confirm it exits non-zero.

## Don't let `pkill -f` match your own shell
`pkill -f "next dev -p 3457"` killed the very shell running it (exit 144) — the pattern matches the
command line of the `bash -c` wrapper too. `pgrep -f 'next'` has the same flaw.

**Rule:** kill dev servers by listening port, not by command-line pattern:
`ss -lptn "sport = :3457" | grep -oP 'pid=\K[0-9]+' | xargs -r kill -9`.

## A placeholder that states no facts cannot go stale
The client-side emergency fallback shipped invented prices (BTC $94,521) and invented headlines behind a
banner that read "USING CACHE" — it was not a cache. It survived unnoticed because it renders only when
*both* API routes throw in the browser. The fix was to delete the numbers, not refresh them.

**Rule:** an error state must assert nothing it has not fetched — no prices, no headlines, no
"last updated" stamp. If a degraded path is tempted to invent plausible data to look healthy, that path
is lying, and the lie is invisible precisely because it is rare.
