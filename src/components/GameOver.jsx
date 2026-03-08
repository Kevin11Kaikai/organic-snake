import './GameOver.css';

export default function GameOver({ score, onRestart }) {
    return (
        <div className="game-over-overlay">
            <div className="game-over-card">
                <div className="game-over-icon">🎮</div>
                <h1 className="game-over-title">Game Over</h1>
                <div className="game-over-score-row">
                    <span className="game-over-score-label">最终得分</span>
                    <span className="game-over-score-value">{score}</span>
                </div>
                <button className="game-over-btn" onClick={onRestart}>
                    重新开始
                </button>
            </div>
        </div>
    );
}
