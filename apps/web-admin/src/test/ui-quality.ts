import axe from "axe-core";
import { HtmlValidate } from "html-validate";

const htmlValidate = new HtmlValidate({
  extends: ["html-validate:recommended", "html-validate:prettier"],
  rules: {
    "attribute-boolean-style": [
      "error",
      {
        style: "empty",
      },
    ],
    "valid-id": [
      "error",
      {
        relaxed: true,
      },
    ],
  },
});

function formatMarkupErrors(results: Awaited<ReturnType<HtmlValidate["validateString"]>>): string {
  return results.results
    .flatMap((result) =>
      result.messages.map(
        (message) =>
          `${message.ruleId ?? "parser"} at ${message.line}:${message.column}: ${message.message}`,
      ),
    )
    .join("\n");
}

function formatAccessibilityViolations(violations: readonly axe.Result[]): string {
  return violations
    .map((violation) => {
      const nodes = violation.nodes
        .map((node) => {
          const target = node.target.join(" > ");
          const summary = node.failureSummary ?? "Accessibility rule failed.";

          return `  ${target}: ${summary}`;
        })
        .join("\n");

      return `${violation.id}: ${violation.help}\n${nodes}`;
    })
    .join("\n\n");
}

export async function validateRenderedUi(container: HTMLElement): Promise<void> {
  const markupReport = await htmlValidate.validateString(container.innerHTML);

  if (!markupReport.valid) {
    throw new Error(`Rendered markup is invalid:\n${formatMarkupErrors(markupReport)}`);
  }

  const accessibilityReport = await axe.run(container, {
    runOnly: {
      type: "tag",
      values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"],
    },
    rules: {
      "color-contrast": {
        enabled: false,
      },
    },
  });

  if (accessibilityReport.violations.length > 0) {
    throw new Error(
      `Accessibility violations found:\n${formatAccessibilityViolations(
        accessibilityReport.violations,
      )}`,
    );
  }
}
