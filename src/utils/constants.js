// 游戏常量配置
export const CANVAS_SIZE = 400;
export const CELL_SIZE = 20;
export const GRID_COUNT = CANVAS_SIZE / CELL_SIZE; // 20x20

// 初始蛇身（3节，从中间偏左开始）
export const INITIAL_SNAKE = [
  { x: 4, y: 10 },
  { x: 3, y: 10 },
  { x: 2, y: 10 },
];

// 初始方向：向右
export const INITIAL_DIRECTION = { x: 1, y: 0 };

// 游戏速度（毫秒），越小越快
export const GAME_SPEED = 140;

// 每吃一个食物得分
export const SCORE_PER_FOOD = 10;

// 方向键映射
export const DIRECTION_MAP = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
};

// Blue 主题颜色配置
export const COLORS = {
  background: '#F3F4F6',                     // 浅灰白色画布背景
  gridLine: 'rgba(59, 130, 246, 0.08)',      // 淡蓝网格线
  snakeHead: '#2563EB',                      // 蓝-600 蛇头
  snakeTail: '#93C5FD',                      // 蓝-300 蛇尾
  food: '#EF4444',                           // 红色食物（与蓝形成对比）
  foodGlow: 'rgba(239, 68, 68, 0.25)',       // 食物光晕
};
