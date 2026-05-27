export function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

export function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function evaluateValue(client, expression) {
  const evaluation = await client.send("Runtime.evaluate", {
    expression,
    returnByValue: true
  });

  return evaluation.result.value;
}

export async function evaluatePromiseValue(client, expression) {
  const evaluation = await client.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true
  });

  return evaluation.result.value;
}

export async function waitForCondition(
  client,
  description,
  predicateExpression,
  attempts = 40
) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const matched = await evaluateValue(client, predicateExpression);

    if (matched) {
      return;
    }

    await sleep(100);
  }

  throw new Error(`Timed out waiting for ${description}.`);
}

export function rectCenter(rect) {
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  };
}

export async function dispatchMouseClick(client, point) {
  await client.send("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x: point.x,
    y: point.y,
    button: "none",
    buttons: 0
  });
  await client.send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: point.x,
    y: point.y,
    button: "left",
    buttons: 1,
    clickCount: 1
  });
  await client.send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: point.x,
    y: point.y,
    button: "left",
    buttons: 0,
    clickCount: 1
  });
}
