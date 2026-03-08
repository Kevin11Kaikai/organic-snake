import './ScoreBoard.css';

export default function ScoreBoard({ score }) {
    return (
        <div className="score-board">
            <div className="score-label">SCORE</div>
            <div className="score-value">{score}</div>
        </div>
    );
}
