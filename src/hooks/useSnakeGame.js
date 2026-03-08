import { useState, useEffect, useCallback, useRef } from 'react';
import {
    GRID_COUNT,
    INITIAL_SNAKE,
    INITIAL_DIRECTION,
    GAME_SPEED,
    SCORE_PER_FOOD,
    DIRECTION_MAP,
} from '../utils/constants';

// 随机生成不与蛇身重叠的食物坐标
function generateFood(snake) {
    let food;
    do {
        food = {
            x: Math.floor(Math.random() * GRID_COUNT),
            y: Math.floor(Math.random() * GRID_COUNT),
        };
    } while (snake.some(seg => seg.x === food.x && seg.y === food.y));
    return food;
}

export function useSnakeGame() {
    const [snake, setSnake] = useState(INITIAL_SNAKE);
    const [direction, setDirection] = useState(INITIAL_DIRECTION);
    const [food, setFood] = useState(() => generateFood(INITIAL_SNAKE));
    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [gameStarted, setGameStarted] = useState(false);

    // 用 ref 保存最新状态，避免闭包陷阱
    const directionRef = useRef(direction);
    const snakeRef = useRef(snake);
    const foodRef = useRef(food);
    const directionQueueRef = useRef([]);
    const gameOverRef = useRef(false);

    useEffect(() => { directionRef.current = direction; }, [direction]);
    useEffect(() => { snakeRef.current = snake; }, [snake]);
    useEffect(() => { foodRef.current = food; }, [food]);
    useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);

    // 处理键盘输入
    const handleKeyDown = useCallback(
        (e) => {
            if (!DIRECTION_MAP[e.key]) return;
            e.preventDefault();

            if (!gameStarted && !gameOver) {
                setGameStarted(true);
            }

            const newDir = DIRECTION_MAP[e.key];
            const currentDir =
                directionQueueRef.current.length > 0
                    ? directionQueueRef.current[directionQueueRef.current.length - 1]
                    : directionRef.current;

            // 禁止 180° 反向
            if (newDir.x + currentDir.x === 0 && newDir.y + currentDir.y === 0) {
                return;
            }

            directionQueueRef.current.push(newDir);
        },
        [gameStarted, gameOver]
    );

    // 监听键盘事件
    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    // 游戏主循环 — 使用 refs 避免嵌套 setState
    useEffect(() => {
        if (gameOver || !gameStarted) return;

        const tick = () => {
            if (gameOverRef.current) return;

            // 从队列取下一个方向
            let currentDir = directionRef.current;
            if (directionQueueRef.current.length > 0) {
                currentDir = directionQueueRef.current.shift();
                setDirection(currentDir);
            }

            const prevSnake = snakeRef.current;
            const head = prevSnake[0];
            const newHead = {
                x: head.x + currentDir.x,
                y: head.y + currentDir.y,
            };

            // 碰撞检测：撞墙
            if (
                newHead.x < 0 ||
                newHead.x >= GRID_COUNT ||
                newHead.y < 0 ||
                newHead.y >= GRID_COUNT
            ) {
                setGameOver(true);
                return;
            }

            // 碰撞检测：撞自身
            if (prevSnake.some(seg => seg.x === newHead.x && seg.y === newHead.y)) {
                setGameOver(true);
                return;
            }

            const currentFood = foodRef.current;
            const ate = newHead.x === currentFood.x && newHead.y === currentFood.y;

            let newSnake;
            if (ate) {
                // 吃到食物：蛇身加长
                newSnake = [newHead, ...prevSnake];
                setScore(s => s + SCORE_PER_FOOD);
                const newFood = generateFood(newSnake);
                setFood(newFood);
            } else {
                // 没吃到食物：去掉尾巴保持长度
                newSnake = [newHead, ...prevSnake.slice(0, -1)];
            }

            setSnake(newSnake);
        };

        const interval = setInterval(tick, GAME_SPEED);
        return () => clearInterval(interval);
    }, [gameOver, gameStarted]);

    // 重新开始游戏
    const resetGame = useCallback(() => {
        const newSnake = [...INITIAL_SNAKE];
        setSnake(newSnake);
        setDirection(INITIAL_DIRECTION);
        directionRef.current = INITIAL_DIRECTION;
        directionQueueRef.current = [];
        const newFood = generateFood(newSnake);
        setFood(newFood);
        foodRef.current = newFood;
        setScore(0);
        setGameOver(false);
        gameOverRef.current = false;
        setGameStarted(false);
    }, []);

    return { snake, food, score, gameOver, gameStarted, resetGame };
}
