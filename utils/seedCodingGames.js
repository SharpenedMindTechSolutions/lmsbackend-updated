import CodingGame from '../models/CodingGameModel.js';

export const INITIAL_GAMES = [
  // ── PYTHON ─────────────────────────────────────────────────────────────
  {
    title: 'Python: List Comprehension Filter',
    description: 'Complete the list comprehension to filter only even numbers from 1 to 10.',
    language: 'python',
    gameType: 'fill-blank',
    difficulty: 'easy',
    starterCode: 'evens = [x for x in range(1, 11) if x % 2 == ___]',
    fillBlankData: {
      codeSnippet: 'evens = [x for x in range(1, 11) if x % 2 == {b1}]',
      blanks: [
        {
          id: 'b1',
          placeholder: '___',
          answer: '0',
          options: ['0', '1', '2', 'True']
        }
      ]
    },
    explanation: 'In Python, `x % 2 == 0` checks if a number divided by 2 has a remainder of 0 (i.e. even numbers).',
    xpReward: 25
  },
  {
    title: 'Python: Mutable Default Argument Bug',
    description: 'Find and fix the classic Python bug with mutable default list argument.',
    language: 'python',
    gameType: 'bug-hunt',
    difficulty: 'medium',
    starterCode: `def append_to_list(val, my_list=[]):\n    my_list.append(val)\n    return my_list`,
    bugHuntData: {
      buggyCode: `def append_to_list(val, my_list=[]):\n    my_list.append(val)\n    return my_list`,
      hint: 'Default argument `my_list=[]` is evaluated only once when the function is defined, sharing state across calls! Use `None` instead.',
      correctCode: `def append_to_list(val, my_list=None):\n    if my_list is None:\n        my_list = []\n    my_list.append(val)\n    return my_list`,
      correction: 'None'
    },
    explanation: 'In Python, default arguments are evaluated once at function definition time. Always use `None` as default for mutable types.',
    xpReward: 30
  },
  {
    title: 'Python: Slice Reversal Output',
    description: 'What is the output of this string slicing expression in Python?',
    language: 'python',
    gameType: 'output-predict',
    difficulty: 'easy',
    starterCode: `word = "Python"\nprint(word[::-1])`,
    outputPredictData: {
      code: `word = "Python"\nprint(word[::-1])`,
      options: ['nohtyP', 'Python', 'P', 'Error'],
      correctAnswer: 'nohtyP'
    },
    explanation: 'The slice `[::-1]` has a step of `-1`, which traverses the string backwards from end to beginning.',
    xpReward: 20
  },
  {
    title: 'Python: Reorder File Reading Logic',
    description: 'Arrange the code blocks in order to safely open a file, read its lines, and print count.',
    language: 'python',
    gameType: 'code-reorder',
    difficulty: 'easy',
    starterCode: '',
    codeReorderData: {
      goal: 'Open "data.txt", read lines, calculate total count, and print output.',
      lines: [
        { id: '1', code: 'with open("data.txt", "r") as f:', correctPosition: 1 },
        { id: '2', code: '    lines = f.readlines()', correctPosition: 2 },
        { id: '3', code: '    total = len(lines)', correctPosition: 3 },
        { id: '4', code: '    print(f"Total lines: {total}")', correctPosition: 4 }
      ]
    },
    explanation: 'The `with` statement automatically manages closing the file after reading lines into the list.',
    xpReward: 25
  },

  // ── JAVASCRIPT ─────────────────────────────────────────────────────────
  {
    title: 'JavaScript: Array Map Method',
    description: 'Fill in the missing JavaScript array method to double each item in the numbers array.',
    language: 'javascript',
    gameType: 'fill-blank',
    difficulty: 'easy',
    starterCode: 'const doubled = numbers.___(n => n * 2);',
    fillBlankData: {
      codeSnippet: 'const doubled = numbers.{b1}(n => n * 2);',
      blanks: [
        {
          id: 'b1',
          placeholder: '___',
          answer: 'map',
          options: ['map', 'filter', 'forEach', 'reduce']
        }
      ]
    },
    explanation: 'Array.prototype.map() creates a new array populated with the results of calling the provided function on every element.',
    xpReward: 25
  },
  {
    title: 'JavaScript: Event Loop Microtask Order',
    description: 'Predict the console output order between Promise microtask and setTimeout macrotask.',
    language: 'javascript',
    gameType: 'output-predict',
    difficulty: 'medium',
    starterCode: `console.log("A");\nsetTimeout(() => console.log("B"), 0);\nPromise.resolve().then(() => console.log("C"));\nconsole.log("D");`,
    outputPredictData: {
      code: `console.log("A");\nsetTimeout(() => console.log("B"), 0);\nPromise.resolve().then(() => console.log("C"));\nconsole.log("D");`,
      options: ['A, D, C, B', 'A, B, C, D', 'A, C, D, B', 'A, D, B, C'],
      correctAnswer: 'A, D, C, B'
    },
    explanation: 'Synchronous code runs first ("A", "D"). Then microtasks (Promise "C") run before macrotasks (setTimeout "B").',
    xpReward: 30
  },
  {
    title: 'JavaScript: Fix Arrow Function `this` Context',
    description: 'Identify the bug in this object method that causes `this.name` to be undefined.',
    language: 'javascript',
    gameType: 'bug-hunt',
    difficulty: 'medium',
    starterCode: `const user = {\n  name: "Alice",\n  greet: () => {\n    return "Hello " + this.name;\n  }\n};`,
    bugHuntData: {
      buggyCode: `const user = {\n  name: "Alice",\n  greet: () => {\n    return "Hello " + this.name;\n  }\n};`,
      hint: 'Arrow functions do not bind their own `this`. Use a standard method shorthand or function expression!',
      correctCode: `const user = {\n  name: "Alice",\n  greet() {\n    return "Hello " + this.name;\n  }\n};`,
      correction: 'greet()'
    },
    explanation: 'Arrow functions retain the `this` value of the enclosing lexical scope, meaning `this.name` refers to window/undefined.',
    xpReward: 30
  },
  {
    title: 'JavaScript: Reorder Async Fetch Logic',
    description: 'Arrange the statements in correct order to fetch data and parse JSON with async/await.',
    language: 'javascript',
    gameType: 'code-reorder',
    difficulty: 'easy',
    starterCode: '',
    codeReorderData: {
      goal: 'Fetch user data from API, parse JSON, and log result.',
      lines: [
        { id: '1', code: 'async function getUser(id) {', correctPosition: 1 },
        { id: '2', code: '  const res = await fetch(`/api/users/${id}`);', correctPosition: 2 },
        { id: '3', code: '  const data = await res.json();', correctPosition: 3 },
        { id: '4', code: '  return data;', correctPosition: 4 },
        { id: '5', code: '}', correctPosition: 5 }
      ]
    },
    explanation: 'We must await the fetch response first, then await response.json() to resolve the parsed payload.',
    xpReward: 25
  },

  // ── HTML ───────────────────────────────────────────────────────────────
  {
    title: 'HTML: Form Email Input Type',
    description: 'Fill in the correct HTML input type for automatic client-side email validation.',
    language: 'html',
    gameType: 'fill-blank',
    difficulty: 'easy',
    starterCode: '<input type="___" name="userEmail" required />',
    fillBlankData: {
      codeSnippet: '<input type="{b1}" name="userEmail" required />',
      blanks: [
        {
          id: 'b1',
          placeholder: '___',
          answer: 'email',
          options: ['email', 'text', 'mail', 'string']
        }
      ]
    },
    explanation: '`<input type="email">` automatically enforces email syntax before form submission in modern browsers.',
    xpReward: 20
  },
  {
    title: 'HTML: Reorder Semantic Page Structure',
    description: 'Arrange the HTML5 tags in standard hierarchical document layout order.',
    language: 'html',
    gameType: 'code-reorder',
    difficulty: 'easy',
    starterCode: '',
    codeReorderData: {
      goal: 'Assemble a standard semantic HTML5 webpage structure.',
      lines: [
        { id: '1', code: '<!DOCTYPE html>', correctPosition: 1 },
        { id: '2', code: '<html lang="en">', correctPosition: 2 },
        { id: '3', code: '  <head><title>My LMS</title></head>', correctPosition: 3 },
        { id: '4', code: '  <body>', correctPosition: 4 },
        { id: '5', code: '    <header><nav></nav></header>', correctPosition: 5 },
        { id: '6', code: '    <main><article></article></main>', correctPosition: 6 },
        { id: '7', code: '    <footer></footer>', correctPosition: 7 },
        { id: '8', code: '  </body></html>', correctPosition: 8 }
      ]
    },
    explanation: 'HTML5 semantic documents start with doctype, followed by html, head, and body with header, main, and footer sections.',
    xpReward: 25
  },

  // ── SQL ────────────────────────────────────────────────────────────────
  {
    title: 'SQL: Aggregate with HAVING Clause',
    description: 'Fill in the correct SQL keyword to filter grouped aggregated results.',
    language: 'sql',
    gameType: 'fill-blank',
    difficulty: 'medium',
    starterCode: 'SELECT department, COUNT(*) FROM employees GROUP BY department ___ COUNT(*) > 5;',
    fillBlankData: {
      codeSnippet: 'SELECT department, COUNT(*) FROM employees GROUP BY department {b1} COUNT(*) > 5;',
      blanks: [
        {
          id: 'b1',
          placeholder: '___',
          answer: 'HAVING',
          options: ['HAVING', 'WHERE', 'FILTER', 'WITH']
        }
      ]
    },
    explanation: '`WHERE` filters rows before grouping, while `HAVING` filters aggregated groups after `GROUP BY`.',
    xpReward: 25
  },
  {
    title: 'SQL: Fix Ambiguous Column Name Bug',
    description: 'Find and fix the error when joining tables that both contain the `id` column.',
    language: 'sql',
    gameType: 'bug-hunt',
    difficulty: 'medium',
    starterCode: `SELECT id, name, order_total\nFROM customers c\nJOIN orders o ON c.id = o.customer_id;`,
    bugHuntData: {
      buggyCode: `SELECT id, name, order_total\nFROM customers c\nJOIN orders o ON c.id = o.customer_id;`,
      hint: 'Both `customers` and `orders` have an `id` column, causing "Column `id` in field list is ambiguous". Prefix `id` with table alias `c.id`!',
      correctCode: `SELECT c.id, c.name, o.order_total\nFROM customers c\nJOIN orders o ON c.id = o.customer_id;`,
      correction: 'c.id'
    },
    explanation: 'When columns with the same name exist in joined tables, qualify them using the table alias (e.g. `c.id`).',
    xpReward: 30
  },
  {
    title: 'SQL: Reorder Query Execution Clauses',
    description: 'Order the SQL query clauses into correct syntax order.',
    language: 'sql',
    gameType: 'code-reorder',
    difficulty: 'medium',
    starterCode: '',
    codeReorderData: {
      goal: 'Write a valid SQL query filtering and sorting top students.',
      lines: [
        { id: '1', code: 'SELECT student_id, AVG(score) AS avg_score', correctPosition: 1 },
        { id: '2', code: 'FROM test_submissions', correctPosition: 2 },
        { id: '3', code: 'WHERE created_at >= "2026-01-01"', correctPosition: 3 },
        { id: '4', code: 'GROUP BY student_id', correctPosition: 4 },
        { id: '5', code: 'HAVING AVG(score) >= 75', correctPosition: 5 },
        { id: '6', code: 'ORDER BY avg_score DESC', correctPosition: 6 },
        { id: '7', code: 'LIMIT 10;', correctPosition: 7 }
      ]
    },
    explanation: 'Standard SQL clause order: SELECT -> FROM -> WHERE -> GROUP BY -> HAVING -> ORDER BY -> LIMIT.',
    xpReward: 30
  }
];

export const seedGamesIfEmpty = async () => {
  try {
    const count = await CodingGame.countDocuments();
    if (count === 0) {
      await CodingGame.insertMany(INITIAL_GAMES);
      console.log(`Seeded ${INITIAL_GAMES.length} Coding Games ✅`);
    }
  } catch (err) {
    console.error('Error seeding coding games:', err.message);
  }
};

export default { INITIAL_GAMES, seedGamesIfEmpty };
