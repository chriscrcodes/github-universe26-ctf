## Review

**Debrief target: minutes 40–45.** You led an AI Purple Team through an
evidence-driven security investigation while keeping human approval in the
loop.

Discuss:

- what Red observed, which flag it captured, and why the public boundary broke;
- how Green connected CodeQL's source, flow, and sink to runtime evidence;
- why parameter binding addressed the root cause, and why the normalization
  helper never could;
- what Mentor's check proved that an agent summary could not;
- where your explicit approval changed the workflow;
- what local regressions proved, and why CodeQL pending is different from
  CodeQL clean;
- why an individual repository is the safe EMU setup for this exercise.

### What's next?

Choose one optional extension:

- explain why a quote/keyword blacklist is not a root-cause fix;
- add a regression for unknown, empty, payload, or unpublished data;
- ask Red and Blue to review the correction independently;
- explain the CodeQL result to a developer and a product owner.

Learn more in the
[CodeQL documentation](https://docs.github.com/code-security/code-scanning/introduction-to-code-scanning/about-code-scanning-with-codeql).
