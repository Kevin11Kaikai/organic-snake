import GameBoard from './components/GameBoard';
import ScoreBoard from './components/ScoreBoard';
import GameOver from './components/GameOver';
import { useSnakeGame } from './hooks/useSnakeGame';
import './App.css';

function App() {
  const { snake, food, score, gameOver, gameStarted, resetGame } = useSnakeGame();

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">🐍 贪吃蛇</h1>
        <ScoreBoard score={score} />
      </header>

      <main className="app-main">
        <div className="game-wrapper">
          <GameBoard snake={snake} food={food} gameStarted={gameStarted} />
          {gameOver && <GameOver score={score} onRestart={resetGame} />}
        </div>
      </main>

      <footer className="app-footer">
        <span>使用方向键 ↑ ↓ ← → 控制</span>
      </footer>
    </div>
  );
}

export default App;
