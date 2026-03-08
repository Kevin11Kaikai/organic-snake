import { useRef, useEffect } from 'react';
import { CANVAS_SIZE, CELL_SIZE, COLORS } from '../utils/constants';
import './GameBoard.css';

// 将网格坐标转换为画布像素中心
function cellCenter(gx, gy) {
    return {
        x: gx * CELL_SIZE + CELL_SIZE / 2,
        y: gy * CELL_SIZE + CELL_SIZE / 2,
    };
}

// ═══════════════════════════════════════════════
// 离屏 Canvas 草地背景 — 仅生成一次，每帧用 drawImage 粘贴
// ═══════════════════════════════════════════════
let _bgCache = null;  // 模块级缓存，跨 render 复用

function getGrassBackground(dpr) {
    if (_bgCache && _bgCache.dpr === dpr) return _bgCache.canvas;

    const w = CANVAS_SIZE * dpr;
    const h = CANVAS_SIZE * dpr;
    const offscreen = document.createElement('canvas');
    offscreen.width = w;
    offscreen.height = h;
    const ctx = offscreen.getContext('2d');
    ctx.scale(dpr, dpr);

    // ── 1. 径向渐变底色 ── 春绿中心 → 深森林绿边缘
    const cx = CANVAS_SIZE / 2;
    const cy = CANVAS_SIZE / 2;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, CANVAS_SIZE * 0.72);
    grad.addColorStop(0, '#8DE021');  // 明亮春绿
    grad.addColorStop(0.4, '#5CB338');  // 中间过渡
    grad.addColorStop(0.8, '#2E7D32');  // 森林绿
    grad.addColorStop(1, '#1E5631');  // 深森林绿边缘
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // ── 2. 程序化草叶 ── 数百条随机分布的弧线笔触
    const bladeCount = 600;
    const rng = mulberry32(42); // 固定种子伪随机，保证每次相同

    for (let i = 0; i < bladeCount; i++) {
        const bx = rng() * CANVAS_SIZE;
        const by = rng() * CANVAS_SIZE;
        const bladeH = 4 + rng() * 10;       // 高度 4–14px
        const bendDir = rng() > 0.5 ? 1 : -1;  // 左右弯曲
        const bendAmount = 2 + rng() * 5;       // 弯曲幅度

        // 颜色变化：混合亮色和暗色半透明笔触
        const isLight = rng() > 0.45;
        ctx.strokeStyle = isLight
            ? `rgba(255, 255, 255, ${0.08 + rng() * 0.10})`
            : `rgba(0, 50, 0, ${0.10 + rng() * 0.12})`;
        ctx.lineWidth = 0.8 + rng() * 1.0;
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(
            bx + bendDir * bendAmount,  // 控制点 x（弯曲方向）
            by - bladeH * 0.6,           // 控制点 y
            bx + bendDir * bendAmount * 0.5,  // 终点 x
            by - bladeH                        // 终点 y
        );
        ctx.stroke();
    }

    // ── 3. 晕影 — 边缘柔和暗化增加深度感
    const vig = ctx.createRadialGradient(cx, cy, CANVAS_SIZE * 0.35, cx, cy, CANVAS_SIZE * 0.72);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.18)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    _bgCache = { canvas: offscreen, dpr };
    return offscreen;
}

// 确定性伪随机生成器（Mulberry32）— 相同种子 → 相同草地
function mulberry32(seed) {
    let s = seed | 0;
    return function () {
        s = (s + 0x6D2B79F5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// ═══════════════════════════════════════════════
// React 组件
// ═══════════════════════════════════════════════
export default function GameBoard({ snake, food, gameStarted }) {
    const canvasRef = useRef(null);
    const frameRef = useRef(0);
    const rafRef = useRef(null);

    // 持续动画循环（食物脉冲 + 平滑帧）
    useEffect(() => {
        let running = true;
        const animate = () => {
            if (!running) return;
            frameRef.current += 1;
            const canvas = canvasRef.current;
            if (canvas) drawFrame(canvas, snake, food, frameRef.current);
            rafRef.current = requestAnimationFrame(animate);
        };
        rafRef.current = requestAnimationFrame(animate);
        return () => {
            running = false;
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [snake, food]);

    return (
        <div className="game-board-container">
            <canvas
                ref={canvasRef}
                style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}
                className="game-board-canvas"
            />
            {!gameStarted && (
                <div className="game-board-overlay start-overlay">
                    <div className="start-text">🎮 按方向键开始游戏</div>
                    <div className="start-hint">使用 ↑ ↓ ← → 控制蛇的移动</div>
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════
// 核心绘制函数
// ═══════════════════════════════════════════════
function drawFrame(canvas, snake, food, frame) {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = CANVAS_SIZE * dpr;
    canvas.height = CANVAS_SIZE * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    // 1. 粘贴预渲染草地背景（单次 drawImage，高性能）
    const bgCanvas = getGrassBackground(dpr);
    ctx.drawImage(bgCanvas, 0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // 2. 动态实体
    drawFood(ctx, food, frame);
    drawSnake(ctx, snake);
}

// ═══════════════════════════════════════════════
// 蛇渲染 — 连续圆头线段 + 方向性头部 + 锥形尾部
// ═══════════════════════════════════════════════
function drawSnake(ctx, snake) {
    if (snake.length === 0) return;

    const bodyWidth = CELL_SIZE * 0.72;
    const tailWidth = CELL_SIZE * 0.3;
    const centers = snake.map(s => cellCenter(s.x, s.y));

    // --- 蛇身阴影 ---
    ctx.save();
    ctx.globalAlpha = 0.15;
    for (let i = 0; i < centers.length - 1; i++) {
        const t = i / Math.max(centers.length - 1, 1);
        const width = bodyWidth * (1 - t) + tailWidth * t;
        ctx.beginPath();
        ctx.moveTo(centers[i].x + 2, centers[i].y + 2);
        ctx.lineTo(centers[i + 1].x + 2, centers[i + 1].y + 2);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
    }
    ctx.restore();

    // --- 蛇身（连续粗线，从头到尾逐渐变细）---
    for (let i = 0; i < centers.length - 1; i++) {
        const t = i / Math.max(centers.length - 1, 1);
        const width = bodyWidth * (1 - t) + tailWidth * t;

        // 颜色渐变  头 #1565C0 → 尾 #64B5F6
        const r = Math.round(21 + t * (100 - 21));
        const g = Math.round(101 + t * (181 - 101));
        const b = Math.round(192 + t * (246 - 192));

        ctx.beginPath();
        ctx.moveTo(centers[i].x, centers[i].y);
        ctx.lineTo(centers[i + 1].x, centers[i + 1].y);
        ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
    }

    // --- 光泽高光 ---
    ctx.save();
    ctx.globalAlpha = 0.2;
    for (let i = 0; i < centers.length - 1; i++) {
        const t = i / Math.max(centers.length - 1, 1);
        const width = (bodyWidth * (1 - t) + tailWidth * t) * 0.25;
        ctx.beginPath();
        ctx.moveTo(centers[i].x - width * 0.6, centers[i].y - width * 0.6);
        ctx.lineTo(centers[i + 1].x - width * 0.6, centers[i + 1].y - width * 0.6);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.stroke();
    }
    ctx.restore();

    // --- 头部 ---
    drawSnakeHead(ctx, centers, bodyWidth);
}

function drawSnakeHead(ctx, centers, bodyWidth) {
    const head = centers[0];
    const headRadius = bodyWidth * 0.58;

    // 计算移动方向
    let dx = 1, dy = 0;
    if (centers.length >= 2) {
        dx = head.x - centers[1].x;
        dy = head.y - centers[1].y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        dx /= len;
        dy /= len;
    }

    // 头部阴影
    ctx.beginPath();
    ctx.arc(head.x + 2, head.y + 2, headRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fill();

    // 头部圆形
    ctx.beginPath();
    ctx.arc(head.x, head.y, headRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#0D47A1';  // deep blue
    ctx.fill();

    // 头部光泽
    const hlGrad = ctx.createRadialGradient(
        head.x - headRadius * 0.3, head.y - headRadius * 0.3, 0,
        head.x, head.y, headRadius
    );
    hlGrad.addColorStop(0, 'rgba(255,255,255,0.30)');
    hlGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.arc(head.x, head.y, headRadius, 0, Math.PI * 2);
    ctx.fillStyle = hlGrad;
    ctx.fill();

    // 眼睛
    const eyeOffset = headRadius * 0.4;
    const eyeRadius = headRadius * 0.24;
    const pupilRadius = eyeRadius * 0.55;
    const nx = -dy;
    const ny = dx;
    const eyeForward = headRadius * 0.35;
    const eyes = [
        { x: head.x + dx * eyeForward + nx * eyeOffset, y: head.y + dy * eyeForward + ny * eyeOffset },
        { x: head.x + dx * eyeForward - nx * eyeOffset, y: head.y + dy * eyeForward - ny * eyeOffset },
    ];

    eyes.forEach(eye => {
        ctx.beginPath();
        ctx.arc(eye.x, eye.y, eyeRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(eye.x + dx * pupilRadius * 0.4, eye.y + dy * pupilRadius * 0.4, pupilRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#0F172A';
        ctx.fill();
    });
}

// ═══════════════════════════════════════════════
// 食物渲染 — 发光脉冲球体（红色 Apple 风格）
// ═══════════════════════════════════════════════
function drawFood(ctx, food, frame) {
    const center = cellCenter(food.x, food.y);
    const baseRadius = CELL_SIZE * 0.40;

    // 脉冲动画 (±8%)
    const pulse = 1 + 0.08 * Math.sin(frame * 0.08);
    const r = baseRadius * pulse;

    // 地面阴影
    ctx.beginPath();
    ctx.ellipse(center.x + 1, center.y + r * 0.7, r * 0.7, r * 0.25, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fill();

    // 外层光晕
    const glowR = r * 2.5;
    const glow = ctx.createRadialGradient(center.x, center.y, r * 0.3, center.x, center.y, glowR);
    glow.addColorStop(0, 'rgba(239, 68, 68, 0.18)');
    glow.addColorStop(0.5, 'rgba(239, 68, 68, 0.05)');
    glow.addColorStop(1, 'rgba(239, 68, 68, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(center.x, center.y, glowR, 0, Math.PI * 2);
    ctx.fill();

    // 球体本体 — 径向渐变模拟 3D
    const bodyGrad = ctx.createRadialGradient(
        center.x - r * 0.3, center.y - r * 0.3, r * 0.1,
        center.x, center.y, r
    );
    bodyGrad.addColorStop(0, '#FCA5A5');
    bodyGrad.addColorStop(0.4, '#EF4444');
    bodyGrad.addColorStop(1, '#B91C1C');
    ctx.beginPath();
    ctx.arc(center.x, center.y, r, 0, Math.PI * 2);
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    // 高光点
    ctx.beginPath();
    ctx.arc(center.x - r * 0.25, center.y - r * 0.25, r * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.fill();

    // 苹果叶子
    ctx.save();
    ctx.translate(center.x + r * 0.05, center.y - r * 0.85);
    ctx.rotate(-0.3);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(4, -5, 2, -9);
    ctx.quadraticCurveTo(-1, -5, 0, 0);
    ctx.fillStyle = '#22C55E';
    ctx.fill();
    ctx.restore();
}
