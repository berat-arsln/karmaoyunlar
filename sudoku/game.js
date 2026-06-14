const SudokuGame = {
    board: [],        // mevcut tahta (0 = boş)
    solution: [],     // tam çözüm
    fixed: [],        // sabit hücreler (boolean)
    difficulty: 'easy',

    // ── TAHTA OLUŞTURMA ──────────────────────────────────────────────
    generateBoard(difficulty) {
        this.difficulty = difficulty;
        this.board = Array(9).fill(0).map(() => Array(9).fill(0));
        this.fixed = Array(9).fill(0).map(() => Array(9).fill(false));

        this.fillBoard(this.board);
        this.solution = this.board.map(r => [...r]);
        this.removeCells(difficulty);

        // fixed hücreleri işaretle
        for (let r = 0; r < 9; r++)
            for (let c = 0; c < 9; c++)
                this.fixed[r][c] = this.board[r][c] !== 0;

        return {
            board: this.board.map(r => [...r]),
            solution: this.solution.map(r => [...r]),
            fixed: this.fixed.map(r => [...r])
        };
    },

    // Backtracking ile tahtayı doldur
    fillBoard(board) {
        const empty = this.findEmpty(board);
        if (!empty) return true;
        const [row, col] = empty;

        const nums = this.shuffle([1,2,3,4,5,6,7,8,9]);
        for (const num of nums) {
            if (this.isValid(board, row, col, num)) {
                board[row][col] = num;
                if (this.fillBoard(board)) return true;
                board[row][col] = 0;
            }
        }
        return false;
    },

    findEmpty(board) {
        for (let r = 0; r < 9; r++)
            for (let c = 0; c < 9; c++)
                if (board[r][c] === 0) return [r, c];
        return null;
    },

    isValid(board, row, col, num) {
        // satır kontrolü
        if (board[row].includes(num)) return false;
        // sütun kontrolü
        for (let r = 0; r < 9; r++)
            if (board[r][col] === num) return false;
        // 3x3 kutu kontrolü
        const br = Math.floor(row / 3) * 3;
        const bc = Math.floor(col / 3) * 3;
        for (let r = br; r < br + 3; r++)
            for (let c = bc; c < bc + 3; c++)
                if (board[r][c] === num) return false;
        return true;
    },

    removeCells(difficulty) {
        const toRemove = { easy: 36, medium: 46, hard: 52, expert: 58 };
        let count = toRemove[difficulty] || 36;
        let attempts = 0;

        while (count > 0 && attempts < 200) {
            const row = Math.floor(Math.random() * 9);
            const col = Math.floor(Math.random() * 9);
            if (this.board[row][col] !== 0) {
                this.board[row][col] = 0;
                count--;
            }
            attempts++;
        }
    },

    shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    },

    // ── HAMLE DOĞRULAMA ──────────────────────────────────────────────
    validateMove(row, col, value) {
        return this.solution[row][col] === value;
    },

    // Bir rakamın tahtada kaç kez doğru yerleştirildiğini say
    countPlaced(board, num) {
        let count = 0;
        for (let r = 0; r < 9; r++)
            for (let c = 0; c < 9; c++)
                if (board[r][c] === num) count++;
        return count;
    },

    // Tahta tamamlandı mı?
    isSolved(board) {
        for (let r = 0; r < 9; r++)
            for (let c = 0; c < 9; c++)
                if (board[r][c] !== this.solution[r][c]) return false;
        return true;
    }
};
