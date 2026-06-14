document.addEventListener('DOMContentLoaded', () => {
    const boardElement = document.getElementById('sudoku-board');
    const newGameBtn = document.getElementById('new-game-btn');
    const difficultySelect = document.getElementById('difficulty');

    function renderBoard(board) {
        boardElement.innerHTML = '';
        board.forEach((row, rowIndex) => {
            row.forEach((cell, colIndex) => {
                const cellDiv = document.createElement('div');
                cellDiv.classList.add('cell');
                if (cell !== 0) {
                    cellDiv.textContent = cell;
                    cellDiv.classList.add('fixed');
                }
                cellDiv.addEventListener('click', () => handleCellClick(cellDiv));
                boardElement.appendChild(cellDiv);
            });
        });
    }

    function handleCellClick(cell) {
        document.querySelectorAll('.cell').forEach(c => c.classList.remove('selected'));
        cell.classList.add('selected');
    }

    newGameBtn.addEventListener('click', () => {
        const difficulty = difficultySelect.value;
        const board = SudokuGame.generateBoard(difficulty);
        renderBoard(board);
    });
});
