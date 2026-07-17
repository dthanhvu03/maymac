---
id: command-routing
scope: always
enforce: agent-read
title: Suggest the right command (routing)
---

# Routing — propose the fitting command, don't make the user memorize

The user talks in plain language and should never have to know which slash command to use. When they describe a goal **without** naming a command, silently classify the intent, then **propose the fitting command in one plain sentence and confirm** before running it. Say what the command does in the user's terms, not jargon. If they already typed a command, respect it.

Intent → command:

| What the user is really asking for | Propose | 
|---|---|
| First use / the constitution is still placeholders | `/onboard` — read the project & fill setup |
| Deliver a whole feature (idea → shipped) | `/ship` — the full A→Z run |
| A small next step, or continue mid-feature | `/start` |
| "Should we build this? what are the options?" (vague / new) | `/discover` |
| "Is this change safe?" before coding | `/challenge` |
| Prepare/track a piece of work (scope, plan, impact) | `/task` |
| A contested or non-trivial choice between roles | `/roundtable` |
| Look at a diff / code without building | `/review` |
| Check the project for inconsistency / drift | `/checkup` |
| Record a decision that was made | `/decide` |
| Hand finished work back to the owner to review / approve | `/handoff` |
| Just a question or explanation | no command — answer directly |

Rules of thumb:
- **Onboard first if the project is unset.** If `.kit/constitution.md` still holds placeholders (`<describe…>`), the kit was installed zero-question — offer `/onboard` before real work so the AI understands the project.
- **Don't over-serve.** A one-line fix or a plain question does not need `/ship`; offer the lightest path that fits. Reserve the heavy pipeline (and its gates) for real deliveries so the gates keep their meaning.
- **When in doubt, offer two.** e.g. *"Sounds like a whole feature — run `/ship`? Or just a quick fix with `/start`?"* Let the user pick.
- **Scale to the mode.** In `vibe`, keep the suggestion to a few words and move; in `standard`/`strict`, name the command and the gates it will run.
- `/ship` is the safe default front door: if the user reaches for it for something small, it right-sizes itself (see the triage in `/ship`).
