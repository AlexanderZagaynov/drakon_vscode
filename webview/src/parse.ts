import type { Token, TokenType, Statement, AttributeStatement, BlockStatement } from './types.js';

export function tokenize(input: string, errors: string[]): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  let line = 1;
  let column = 1;

  const addToken = (type: TokenType, value: string | number | null, startLine: number, startColumn: number) => {
    tokens.push({ type, value, line: startLine, column: startColumn });
  };

  const advance = (count = 1) => {
    for (let i = 0; i < count; i += 1) {
      if (input[index] === '\n') {
        line += 1;
        column = 1;
      } else {
        column += 1;
      }
      index += 1;
    }
  };

  while (index < input.length) {
    const char = input[index] ?? '';

    if (/\s/.test(char)) {
      advance();
      continue;
    }

    if (char === '/' && input[index + 1] === '/') {
      while (index < input.length && input[index] !== '\n') {
        advance();
      }
      continue;
    }

    if (char === '#') {
      while (index < input.length && input[index] !== '\n') {
        advance();
      }
      continue;
    }

    const startLine = line;
    const startColumn = column;

    if (char === '"' || char === "'") {
      const quote = char;
      advance();
      let value = '';
      let escaped = false;
      while (index < input.length) {
        const current = input[index] ?? '';
        if (escaped) {
          if (current === 'n') value += '\n';
          else if (current === 't') value += '\t';
          else value += current;
          escaped = false;
          advance();
          continue;
        }
        if (current === '\\') {
          escaped = true;
          advance();
          continue;
        }
        if (current === quote) {
          advance();
          addToken('string', value, startLine, startColumn);
          break;
        }
        value += current;
        advance();
      }
      if (escaped) {
        errors.push(`Unterminated escape sequence at line ${line}.`);
      }
      continue;
    }

    if (char === '{') {
      addToken('brace_open', '{', startLine, startColumn);
      advance();
      continue;
    }
    if (char === '}') {
      addToken('brace_close', '}', startLine, startColumn);
      advance();
      continue;
    }
    if (char === '[') {
      addToken('bracket_open', '[', startLine, startColumn);
      advance();
      continue;
    }
    if (char === ']') {
      addToken('bracket_close', ']', startLine, startColumn);
      advance();
      continue;
    }
    if (char === '=') {
      addToken('equals', '=', startLine, startColumn);
      advance();
      continue;
    }
    if (char === ',') {
      addToken('comma', ',', startLine, startColumn);
      advance();
      continue;
    }

    if (/-?\d/.test(char)) {
      let value = '';
      while (index < input.length && /[0-9.]/.test(input[index] ?? '')) {
        value += input[index];
        advance();
      }
      addToken('number', Number(value), startLine, startColumn);
      continue;
    }

    if (/[A-Za-z_\-]/.test(char)) {
      let value = '';
      while (index < input.length && /[A-Za-z0-9_\-./?@]/.test(input[index] ?? '')) {
        value += input[index];
        advance();
      }
      addToken('identifier', value, startLine, startColumn);
      continue;
    }

    errors.push(`Unexpected character "${char}" at line ${line}, column ${column}.`);
    advance();
  }

  tokens.push({ type: 'eof', value: null, line, column });
  return tokens;
}

export class Parser {
  private readonly tokens: Token[];
  private readonly errors: string[];
  private index = 0;

  constructor(tokens: Token[], errors: string[]) {
    this.tokens = tokens;
    this.errors = errors;
  }

  private current(): Token {
    return this.tokens[this.index];
  }

  private peek(offset = 1): Token {
    return this.tokens[this.index + offset];
  }

  private consume(): Token {
    const token = this.tokens[this.index];
    this.index += 1;
    return token;
  }

  private expect(type: TokenType, value?: string): Token {
    const token = this.current();
    if (!token || token.type !== type || (value !== undefined && token.value !== value)) {
      this.errors.push(
        `Unexpected token "${token?.value ?? 'EOF'}" at line ${token?.line ?? 0}. Expected ${value ?? type}.`
      );
      return this.consume();
    }
    return this.consume();
  }

  parse(): Statement[] {
    const statements: Statement[] = [];
    while (this.current().type !== 'eof') {
      if (this.current().type === 'identifier') {
        if (this.peek().type === 'equals') {
          statements.push(this.parseAttribute());
        } else {
          statements.push(this.parseBlock());
        }
      } else {
        this.errors.push(`Unexpected token "${this.current().value}" at line ${this.current().line}.`);
        this.consume();
      }
    }
    return statements;
  }

  private parseBlock(): BlockStatement {
    const nameToken = this.expect('identifier');
    const labels: string[] = [];
    while (this.current().type === 'string') {
      const labelToken = this.consume();
      labels.push(String(labelToken.value));
    }
    this.expect('brace_open');
    const body: Statement[] = [];
    while (this.current().type !== 'brace_close' && this.current().type !== 'eof') {
      if (this.current().type === 'identifier' && this.peek().type === 'equals') {
        body.push(this.parseAttribute());
      } else if (this.current().type === 'identifier') {
        body.push(this.parseBlock());
      } else {
        this.errors.push(`Unexpected token "${this.current().value}" in block "${String(nameToken.value)}".`);
        this.consume();
      }
    }
    this.expect('brace_close');
    return { type: 'block', name: String(nameToken.value), labels, body };
  }

  private parseAttribute(): AttributeStatement {
    const keyToken = this.expect('identifier');
    this.expect('equals');
    const value = this.parseValue();
    return { type: 'attribute', key: String(keyToken.value), value };
  }

  private parseValue(): unknown {
    const token = this.current();
    if (token.type === 'string') {
      this.consume();
      return token.value ?? '';
    }
    if (token.type === 'number') {
      this.consume();
      return token.value ?? 0;
    }
    if (token.type === 'identifier') {
      this.consume();
      if (token.value === 'true') return true;
      if (token.value === 'false') return false;
      return token.value ?? '';
    }
    if (token.type === 'bracket_open') {
      return this.parseArray();
    }
    if (token.type === 'brace_open') {
      return this.parseObject();
    }
    this.errors.push(`Unexpected value "${token.value}" at line ${token.line}, column ${token.column}.`);
    this.consume();
    return null;
  }

  private parseArray(): unknown[] {
    this.expect('bracket_open');
    const values: unknown[] = [];
    while (this.current().type !== 'bracket_close' && this.current().type !== 'eof') {
      values.push(this.parseValue());
      if (this.current().type === 'comma') {
        this.consume();
      } else {
        break;
      }
    }
    this.expect('bracket_close');
    return values;
  }

  private parseObject(): Record<string, unknown> {
    this.expect('brace_open');
    const obj: Record<string, unknown> = {};
    while (this.current().type !== 'brace_close' && this.current().type !== 'eof') {
      const keyToken = this.expect('identifier');
      this.expect('equals');
      obj[String(keyToken.value)] = this.parseValue();
      if (this.current().type === 'comma') {
        this.consume();
      }
    }
    this.expect('brace_close');
    return obj;
  }
}
