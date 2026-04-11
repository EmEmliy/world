type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null;
}

function readText(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(readText).join('');
  }

  if (!isRecord(value)) {
    return '';
  }

  if (typeof value.text === 'string') {
    return value.text;
  }

  if (isRecord(value.text) && typeof value.text.value === 'string') {
    return value.text.value;
  }

  if (typeof value.value === 'string') {
    return value.value;
  }

  if (typeof value.content === 'string') {
    return value.content;
  }

  if (Array.isArray(value.content)) {
    return value.content.map(readText).join('');
  }

  return '';
}

export function extractVisibleDeltaText(payload: unknown): string {
  if (!isRecord(payload)) {
    return '';
  }

  const choices = Array.isArray(payload.choices) ? payload.choices : [];
  const firstChoice = choices.length > 0 && isRecord(choices[0]) ? choices[0] : null;
  const delta = firstChoice && isRecord(firstChoice.delta) ? firstChoice.delta : null;
  const message = firstChoice && isRecord(firstChoice.message) ? firstChoice.message : null;

  const candidates = [
    delta?.content,
    delta?.text,
    message?.content,
    firstChoice?.text,
    payload.content,
    payload.output_text,
  ];

  for (const candidate of candidates) {
    const text = readText(candidate);
    if (text) {
      return text;
    }
  }

  return '';
}

export function resolveIncrementalVisibleText(payload: unknown, currentText: string): string {
  const text = extractVisibleDeltaText(payload);
  if (!text) {
    return '';
  }

  if (!currentText) {
    return text;
  }

  if (text === currentText) {
    return '';
  }

  if (text.startsWith(currentText)) {
    return text.slice(currentText.length);
  }

  return text;
}

export function createThinkStripper() {
  let inThink = false;
  let tagBuffer = '';

  const OPEN_TAG = '<think>';
  const CLOSE_TAG = '</think>';

  const flushTagBuffer = () => {
    if (!tagBuffer) {
      return '';
    }
    const text = tagBuffer;
    tagBuffer = '';
    return text;
  };

  const strip = (input: string): string => {
    if (!input) {
      return '';
    }

    let out = '';
    let i = 0;

    while (i < input.length) {
      if (inThink) {
        const end = input.indexOf(CLOSE_TAG, i);
        if (end === -1) {
          i = input.length;
        } else {
          inThink = false;
          i = end + CLOSE_TAG.length;
        }
        continue;
      }

      const ch = input[i];
      tagBuffer += ch;
      i += 1;

      if (OPEN_TAG.startsWith(tagBuffer)) {
        if (tagBuffer === OPEN_TAG) {
          inThink = true;
          tagBuffer = '';
        }
        continue;
      }

      out += tagBuffer[0];
      const rest = tagBuffer.slice(1);
      tagBuffer = '';

      if (rest) {
        out += strip(rest);
      }
    }

    if (tagBuffer && !OPEN_TAG.startsWith(tagBuffer)) {
      out += flushTagBuffer();
    }

    return out;
  };

  return strip;
}

export function createSseEvent(text: string) {
  return `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`;
}
