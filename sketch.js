let backgroundImage; // 宣告背景圖片變數
let stopSprite; // 宣告角色待機動畫精靈圖變數
let runSprite; // 宣告角色跑步動畫精靈圖變數
let effectSprite;
let rewardEffectSprite;
let lightningSound;
let explosionSound;

const stopFrameCount = 4; // 設定待機動畫總格數為 4 格
const runFrameCount = 4; // 設定跑步動畫總格數為 4 格
const effectFrameCount = 14;
const rewardEffectFrameCount = 10;
const effectDuration = 1000;
const effectMinInterval = 1000;
const effectMaxInterval = 3000;

const backgroundOriginalWidth = 1536; // 設定背景圖片原始寬度
const backgroundOriginalHeight = 1024; // 設定背景圖片原始高度
const characterSourceStopWidth = 427 / stopFrameCount; // 計算待機動畫單格原始寬度
const characterSourceStopHeight = 55; // 設定待機動畫單格原始高度
const characterSourceRunWidth = 251 / runFrameCount; // 計算跑步動畫單格原始寬度
const characterSourceRunHeight = 56; // 設定跑步動畫單格原始高度

const characterVerticalRatio = 0.8; // 設定角色中心位於畫面高度的 80% 位置
const characterHeightRatio = 0.2; // 設定角色顯示高度為畫面高度的 20%
const backgroundMoveSpeedRatio = 0.008; // 設定背景移動速度相對於畫面寬度的比例
const characterMoveSpeedRatio = 0.008; // 設定角色移動速度相對於畫面寬度的比例
const frameInterval = 8; // 設定動畫每隔 8 個畫面切換一次

let backgroundDisplayWidth = 0; // 儲存單張背景顯示寬度
let backgroundDisplayHeight = 0; // 儲存單張背景顯示高度
let backgroundTotalWidth = 0; // 儲存三張背景串接後的總寬度
let backgroundX = 0; // 儲存三張背景最左側的水平座標
let backgroundY = 0; // 儲存背景圖片的垂直座標
let backgroundMinX = 0; // 儲存背景最左側可移動邊界
let backgroundMaxX = 0; // 儲存背景最右側可移動邊界
let edgeCharacterDirection = ""; // 儲存角色目前是否在背景邊界自由移動

let characterX = 0; // 儲存角色中心點的水平座標
let characterY = 0; // 儲存角色中心點的垂直座標
let currentFrame = 0; // 儲存目前播放的動畫格
let frameTimer = 0; // 儲存動畫播放計時器
let facingLeft = false; // 儲存角色是否面向左方
let returnToCenterDirection = ""; // 儲存角色是否正在返回畫面中央
let movementMode = "normal"; // 儲存目前移動模式，可為 normal、returning 或 scrolling
let activeEffects = [];
let nextEffectSpawnTime = 0;
let wasCharacterInEffectZone = false;
let questionState = null;
let rewardEffectsEnabled = false;

function preload() { // 在建立畫布前先載入圖片資源
  backgroundImage = loadImage("background.png"); // 載入背景圖片
  stopSprite = loadImage("keroro/stop/stop.png"); // 載入角色待機動畫精靈圖
  runSprite = loadImage("keroro/run/run.png"); // 載入角色跑步動畫精靈圖
  effectSprite = loadImage("effect/1/effect1.png");
  rewardEffectSprite = loadImage("effect/2/effect2.png");
  lightningSound = loadSound("閃電音效.mp3");
  explosionSound = loadSound("爆炸音效.mp3");
} // 結束 preload 函式

function setup() { // 執行一次初始化設定
  createCanvas(windowWidth, windowHeight); // 建立符合瀏覽器視窗大小的畫布
  imageMode(CORNER); // 設定圖片使用左上角作為繪製基準
  frameRate(60); // 設定畫面更新速率為每秒 60 格
  explosionSound.setVolume(0.4);
  updateLayout(); // 根據畫面大小計算背景與角色資料
  characterX = width / 2; // 將角色初始水平位置設定在畫面中央
  characterY = height * characterVerticalRatio; // 將角色垂直位置設定在畫面高度 80%
} // 結束 setup 函式

function draw() { // 每一格畫面都會執行的主要函式
  const movingLeft = keyIsDown(LEFT_ARROW); // 判斷是否按住左方向鍵
  const movingRight = keyIsDown(RIGHT_ARROW); // 判斷是否按住右方向鍵
  const isMoving = movingLeft !== movingRight; // 只要只按住一個方向鍵就播放跑步動畫

  if (movingLeft && !movingRight) { // 如果只按住左方向鍵
    facingLeft = true; // 讓角色面向左方
    moveSceneLeft(); // 執行左方向移動邏輯
  } else if (movingRight && !movingLeft) { // 如果只按住右方向鍵
    facingLeft = false; // 讓角色面向右方
    moveSceneRight(); // 執行右方向移動邏輯
  } else { // 如果沒有按住單一方向鍵
    movementMode = "normal"; // 將移動模式恢復為一般狀態
    returnToCenterDirection = ""; // 清除返回中央狀態
    edgeCharacterDirection = ""; // 清除邊界角色移動狀態
  } // 結束方向移動判斷

  drawConnectedBackground(); // 繪製三張水平串接的背景圖片
  updateEffectSpawning();
  drawFallingEffects();
  checkEffectCollisions();

  if (!isMoving) { // 如果沒有按住左右方向鍵
    currentFrame = 0; // 將待機動畫固定在第一格
    frameTimer = 0; // 將動畫計時器歸零
  } else { // 如果角色正在移動
    updateRunAnimation(); // 更新跑步動畫
  } // 結束角色動畫狀態判斷

  drawCharacter(); // 繪製目前角色動畫
  drawQuestionPanel();
} // 結束 draw 函式

function updateEffectSpawning() {
  const isInEffectZone = isCharacterInEffectZone();
  const currentTime = millis();

  if (!isInEffectZone) {
    wasCharacterInEffectZone = false;
    nextEffectSpawnTime = 0;
    return;
  }

  if (questionState) {
    return;
  }

  if (!wasCharacterInEffectZone) {
    wasCharacterInEffectZone = true;
    spawnFallingEffect(currentTime);
    nextEffectSpawnTime = currentTime + random(effectMinInterval, effectMaxInterval);
    return;
  }

  if (currentTime >= nextEffectSpawnTime) {
    spawnFallingEffect(currentTime);
    nextEffectSpawnTime = currentTime + random(effectMinInterval, effectMaxInterval);
  }
}

function isCharacterInEffectZone() {
  if (!isImageReady(backgroundImage) || backgroundDisplayWidth <= 0) {
    return false;
  }

  const thirdBackgroundStartX = backgroundX + backgroundDisplayWidth * 2;
  const characterXInThirdBackground = characterX - thirdBackgroundStartX;
  return characterXInThirdBackground >= backgroundDisplayWidth / 2 && characterXInThirdBackground <= backgroundDisplayWidth;
}

function spawnFallingEffect(startTime) {
  const isRewardEffect = rewardEffectsEnabled;
  const sprite = isRewardEffect ? rewardEffectSprite : effectSprite;
  const frameCount = isRewardEffect ? rewardEffectFrameCount : effectFrameCount;

  if (!isImageReady(sprite)) {
    return;
  }

  const scale = isRewardEffect ? random(0.4, 0.8) : 1;
  const displayHeight = min(sprite.height, height) * scale;
  const displayWidth = displayHeight * sprite.width / frameCount / sprite.height;
  const effectZoneLeft = backgroundX + backgroundDisplayWidth * 2.5;
  const effectZoneRight = backgroundX + backgroundDisplayWidth * 3;
  const minimumX = max(0, effectZoneLeft);
  const maximumX = min(width - displayWidth, effectZoneRight - displayWidth);

  if (maximumX < minimumX) {
    return;
  }

  activeEffects.push({
    type: isRewardEffect ? "reward" : "lightning",
    x: random(minimumX, maximumX),
    startTime: startTime,
    targetY: characterY,
    scale: scale
  });
  playEffectSound(isRewardEffect ? explosionSound : lightningSound);
}

function playEffectSound(sound) {
  if (sound && sound.isLoaded()) {
    sound.play();
  }
}

function drawFallingEffects() {
  const currentTime = millis();

  activeEffects = activeEffects.filter(function (effect) {
    const isRewardEffect = effect.type === "reward";
    const sprite = isRewardEffect ? rewardEffectSprite : effectSprite;
    const frameCount = isRewardEffect ? rewardEffectFrameCount : effectFrameCount;
    if (!isImageReady(sprite)) {
      return true;
    }

    const elapsedTime = currentTime - effect.startTime;
    if (elapsedTime >= effectDuration) {
      return false;
    }

    const scale = isRewardEffect ? effect.scale : 1;
    const displayHeight = min(sprite.height, height) * scale;
    const displayWidth = displayHeight * sprite.width / frameCount / sprite.height;
    const progress = elapsedTime / effectDuration;
    const frameIndex = floor(progress * frameCount);
    const frameData = getFrameData(sprite, frameCount, frameIndex);
    const descentDuration = effectDuration * 2 / effectFrameCount;
    const effectY = isRewardEffect
      ? effect.targetY - displayHeight
      : elapsedTime < descentDuration
        ? -displayHeight + effect.targetY * elapsedTime / descentDuration
        : effect.targetY - displayHeight;
    image(sprite, effect.x, effectY, displayWidth, displayHeight, frameData.sourceLeft, 0, frameData.sourceWidth, frameData.sourceHeight);
    return true;
  });
}

function checkEffectCollisions() {
  if (questionState) {
    return;
  }

  const characterWidth = getCurrentCharacterWidth();
  const characterHeight = height * characterHeightRatio;
  const characterLeft = characterX - characterWidth / 2;
  const characterTop = characterY - characterHeight / 2;

  for (let index = 0; index < activeEffects.length; index++) {
    const effect = activeEffects[index];
    if (effect.type !== "lightning") {
      continue;
    }

    const elapsedTime = millis() - effect.startTime;
    const displayHeight = min(effectSprite.height, height);
    const displayWidth = displayHeight * effectSprite.width / effectFrameCount / effectSprite.height;
    const descentDuration = effectDuration * 2 / effectFrameCount;
    const effectY = elapsedTime < descentDuration
      ? -displayHeight + effect.targetY * elapsedTime / descentDuration
      : effect.targetY - displayHeight;
    const overlapsCharacter = effect.x < characterLeft + characterWidth
      && effect.x + displayWidth > characterLeft
      && effectY < characterTop + characterHeight
      && effectY + displayHeight > characterTop;

    if (overlapsCharacter) {
      activeEffects.splice(index, 1);
      questionState = createArithmeticQuestion(effect);
      break;
    }
  }
}

function createArithmeticQuestion(effect) {
  const operation = floor(random(4));
  let firstNumber;
  let secondNumber;
  let answer;
  let symbol;

  if (operation === 0) {
    firstNumber = floor(random(1, 21));
    secondNumber = floor(random(1, 21));
    answer = firstNumber + secondNumber;
    symbol = "+";
  } else if (operation === 1) {
    firstNumber = floor(random(2, 21));
    secondNumber = floor(random(1, firstNumber + 1));
    answer = firstNumber - secondNumber;
    symbol = "-";
  } else if (operation === 2) {
    firstNumber = floor(random(2, 13));
    secondNumber = floor(random(2, 13));
    answer = firstNumber * secondNumber;
    symbol = "x";
  } else {
    secondNumber = floor(random(2, 13));
    answer = floor(random(1, 13));
    firstNumber = secondNumber * answer;
    symbol = "/";
  }

  const choices = [answer];
  while (choices.length < 4) {
    const distractor = answer + floor(random(-10, 11));
    if (distractor >= 0 && !choices.includes(distractor)) {
      choices.push(distractor);
    }
  }

  for (let index = choices.length - 1; index > 0; index--) {
    const swapIndex = floor(random(index + 1));
    [choices[index], choices[swapIndex]] = [choices[swapIndex], choices[index]];
  }

  return {
    effect: effect,
    prompt: `${firstNumber} ${symbol} ${secondNumber} = ?`,
    answer: answer,
    choices: choices
  };
}

function getQuestionPanelBounds() {
  const panelWidth = width / 4;
  const panelHeight = height / 4;
  return {
    x: (width - panelWidth) / 2,
    y: (height - panelHeight) / 2,
    width: panelWidth,
    height: panelHeight
  };
}

function getQuestionOptionBounds(index, panel) {
  const gap = max(4, panel.width * 0.04);
  const padding = gap;
  const optionWidth = (panel.width - padding * 2 - gap) / 2;
  const optionHeight = (panel.height * 0.46 - gap) / 2;
  return {
    x: panel.x + padding + (index % 2) * (optionWidth + gap),
    y: panel.y + panel.height * 0.49 + floor(index / 2) * (optionHeight + gap),
    width: optionWidth,
    height: optionHeight
  };
}

function drawQuestionPanel() {
  if (!questionState) {
    return;
  }

  const panel = getQuestionPanelBounds();
  push();
  rectMode(CORNER);
  fill(254, 250, 224, 204);
  stroke(76, 86, 58, 220);
  strokeWeight(1);
  rect(panel.x, panel.y, panel.width, panel.height, 5);
  noStroke();
  fill(35, 40, 30);
  textAlign(CENTER, CENTER);
  textSize(max(9, min(panel.width * 0.1, panel.height * 0.12)));
  text(questionState.prompt, panel.x + 4, panel.y + panel.height * 0.25, panel.width - 8, panel.height * 0.2);

  questionState.choices.forEach(function (choice, index) {
    const option = getQuestionOptionBounds(index, panel);
    fill(255, 255, 255, 190);
    stroke(76, 86, 58, 200);
    rect(option.x, option.y, option.width, option.height, 3);
    noStroke();
    fill(35, 40, 30);
    textSize(max(8, min(option.width * 0.22, option.height * 0.45)));
    text(String(choice), option.x + 2, option.y + 2, option.width - 4, option.height - 4);
  });
  pop();
}

function mousePressed() {
  userStartAudio();

  if (!questionState) {
    return true;
  }

  const panel = getQuestionPanelBounds();
  for (let index = 0; index < questionState.choices.length; index++) {
    const option = getQuestionOptionBounds(index, panel);
    const clickedOption = mouseX >= option.x && mouseX <= option.x + option.width
      && mouseY >= option.y && mouseY <= option.y + option.height;
    if (clickedOption) {
      submitQuestionAnswer(index);
      return false;
    }
  }
  return false;
}

function submitQuestionAnswer(choiceIndex) {
  const answeredQuestion = questionState;
  questionState = null;

  if (answeredQuestion.choices[choiceIndex] === answeredQuestion.answer) {
    rewardEffectsEnabled = true;
    answeredQuestion.effect.type = "reward";
    answeredQuestion.effect.startTime = millis();
    answeredQuestion.effect.targetY = characterY;
    answeredQuestion.effect.scale = random(0.4, 0.8);
    activeEffects.push(answeredQuestion.effect);
    playEffectSound(explosionSound);
  }

  nextEffectSpawnTime = millis() + random(effectMinInterval, effectMaxInterval);
}

function updateLayout() { // 根據畫面大小重新計算所有版面資料
  if (!isImageReady(backgroundImage)) { // 如果背景圖片尚未載入完成
    return; // 暫停背景版面計算
  } // 結束背景圖片判斷

  const previousBackgroundRatio = getBackgroundScrollRatio(); // 儲存視窗改變前的背景捲動比例
  const previousCharacterRatio = characterX / max(1, width); // 儲存角色改變前的水平比例

  backgroundDisplayHeight = height; // 將背景高度設定為畫布高度
  backgroundDisplayWidth = backgroundDisplayHeight * backgroundImage.width / backgroundImage.height; // 依圖片原比例計算背景寬度
  backgroundTotalWidth = backgroundDisplayWidth * 3; // 計算三張背景圖片串接後的總寬度
  backgroundY = (height - backgroundDisplayHeight) / 2; // 將背景圖片垂直置中
  backgroundMinX = min(0, width - backgroundTotalWidth); // 計算背景最左側邊界
  backgroundMaxX = 0; // 設定背景最右側邊界

  if (backgroundTotalWidth <= width) { // 如果三張背景仍不足以填滿畫面
    backgroundX = (width - backgroundTotalWidth) / 2; // 將三張背景整體置中
  } else if (previousBackgroundRatio >= 0) { // 如果先前背景位於最右側
    backgroundX = backgroundMaxX; // 將背景固定在最右側
  } else { // 如果先前背景不是位於最右側
    backgroundX = backgroundMinX + previousBackgroundRatio * (backgroundMaxX - backgroundMinX); // 依原本比例恢復背景位置
  } // 結束背景水平位置判斷

  characterX = width * previousCharacterRatio; // 依照新畫面寬度恢復角色水平比例位置
  characterY = height * characterVerticalRatio; // 依照新畫面高度恢復角色垂直位置
  constrainCharacterPosition(); // 重新限制角色不能超出畫布
} // 結束 updateLayout 函式

function drawConnectedBackground() { // 繪製三張水平串接的背景圖片
  background("#87CEEB"); // 使用天空藍填滿未被圖片覆蓋的區域

  if (!isImageReady(backgroundImage)) { // 如果背景圖片尚未載入完成
    return; // 暫停背景圖片繪製
  } // 結束背景圖片判斷

  image(backgroundImage, backgroundX, backgroundY, backgroundDisplayWidth, backgroundDisplayHeight); // 繪製左側背景圖片
  image(backgroundImage, backgroundX + backgroundDisplayWidth, backgroundY, backgroundDisplayWidth, backgroundDisplayHeight); // 繪製中央背景圖片
  image(backgroundImage, backgroundX + backgroundDisplayWidth * 2, backgroundY, backgroundDisplayWidth, backgroundDisplayHeight); // 繪製右側背景圖片
} // 結束 drawConnectedBackground 函式

function moveSceneRight() { // 處理按下右方向鍵時的移動
  const centerX = width / 2; // 取得畫面水平中央位置
  const sceneMoveSpeed = width * backgroundMoveSpeedRatio; // 計算背景向左移動速度

  if (movementMode === "returning" && returnToCenterDirection === "right") { // 如果角色正在由左側返回中央
    moveCharacterToCenter(); // 每一幀只讓角色向中央移動一小段
    return; // 返回中央期間背景完全不動
  } // 結束返回中央判斷

  if (backgroundX >= backgroundMaxX && characterX < centerX) { // 如果背景在最右側且角色位於畫面中央左側
    movementMode = "returning"; // 切換成返回中央模式
    returnToCenterDirection = "right"; // 設定角色向右返回中央
    moveCharacterToCenter(); // 本幀只移動角色一小段
    return; // 返回期間背景不移動
  } // 結束邊界返回中央判斷

  if (backgroundTotalWidth > width && backgroundX > backgroundMinX) { // 如果背景尚未到達最左側
    movementMode = "scrolling"; // 設定目前為背景捲動模式
    backgroundX -= sceneMoveSpeed; // 讓背景向左移動
    backgroundX = max(backgroundX, backgroundMinX); // 限制背景不能超過最左側
    return; // 背景移動期間角色保持目前位置
  } // 結束背景捲動判斷

  if (characterX < centerX) { // 如果背景在最左側且角色位於畫面中央左側
    movementMode = "returning"; // 切換成返回中央模式
    returnToCenterDirection = "right"; // 設定角色向右返回中央
    moveCharacterToCenter(); // 本幀只移動角色一小段
    return; // 返回期間背景不移動
  } // 結束角色返回判斷

  movementMode = "edgeCharacter"; // 切換成邊界角色移動模式
  edgeCharacterDirection = "right"; // 設定角色向右移動
  moveCharacterRight(); // 讓角色向右移動
} // 結束 moveSceneRight 函式

function moveSceneLeft() { // 處理按下左方向鍵時的移動
  const centerX = width / 2; // 取得畫面水平中央位置
  const sceneMoveSpeed = width * backgroundMoveSpeedRatio; // 計算背景向右移動速度

  if (movementMode === "returning" && returnToCenterDirection === "left") { // 如果角色正在由右側返回中央
    moveCharacterToCenter(); // 每一幀只讓角色向中央移動一小段
    return; // 返回中央期間背景完全不動
  } // 結束返回中央判斷

  if (backgroundX <= backgroundMinX && characterX > centerX) { // 如果背景在最左側且角色位於畫面中央右側
    movementMode = "returning"; // 切換成返回中央模式
    returnToCenterDirection = "left"; // 設定角色向左返回中央
    moveCharacterToCenter(); // 本幀只移動角色一小段
    return; // 返回期間背景不移動
  } // 結束邊界返回中央判斷

  if (backgroundTotalWidth > width && backgroundX < backgroundMaxX) { // 如果背景尚未到達最右側
    movementMode = "scrolling"; // 設定目前為背景捲動模式
    backgroundX += sceneMoveSpeed; // 讓背景向右移動
    backgroundX = min(backgroundX, backgroundMaxX); // 限制背景不能超過最右側
    return; // 背景移動期間角色保持目前位置
  } // 結束背景捲動判斷

  if (characterX > centerX) { // 如果背景在最右側且角色位於畫面中央右側
    movementMode = "returning"; // 切換成返回中央模式
    returnToCenterDirection = "left"; // 設定角色向左返回中央
    moveCharacterToCenter(); // 本幀只移動角色一小段
    return; // 返回期間背景不移動
  } // 結束角色返回判斷

  movementMode = "edgeCharacter"; // 切換成邊界角色移動模式
  edgeCharacterDirection = "left"; // 設定角色向左移動
  moveCharacterLeft(); // 讓角色向左移動
} // 結束 moveSceneLeft 函式

function moveCharacterRight() { // 讓角色向右移動
  const characterMoveSpeed = width * characterMoveSpeedRatio; // 計算角色向右移動速度
  const characterWidth = getCurrentCharacterWidth(); // 取得目前角色寬度
  const rightLimit = width - characterWidth / 2; // 計算角色右側邊界

  characterX = min(characterX + characterMoveSpeed, rightLimit); // 讓角色向右移動且不超出畫布
  constrainCharacterPosition(); // 再次限制角色不能超出畫布
} // 結束 moveCharacterRight 函式

function moveCharacterLeft() { // 讓角色向左移動
  const characterMoveSpeed = width * characterMoveSpeedRatio; // 計算角色向左移動速度
  const characterWidth = getCurrentCharacterWidth(); // 取得目前角色寬度
  const leftLimit = characterWidth / 2; // 計算角色左側邊界

  characterX = max(characterX - characterMoveSpeed, leftLimit); // 讓角色向左移動且不超出畫布
  constrainCharacterPosition(); // 再次限制角色不能超出畫布
} // 結束 moveCharacterLeft 函式

function moveCharacterToCenter() { // 讓角色逐步返回畫面中央
  const centerX = width / 2; // 取得畫面水平中央位置
  const characterMoveSpeed = width * characterMoveSpeedRatio; // 計算角色每一幀的移動距離
  const distanceToCenter = centerX - characterX; // 計算角色與中央的距離

  if (abs(distanceToCenter) <= characterMoveSpeed) { // 只有距離小於一個移動單位時才正式到達中央
    characterX = centerX; // 將角色精確放到畫面中央
    movementMode = "scrolling"; // 設定返回中央已完成
    returnToCenterDirection = ""; // 清除返回中央狀態
    return; // 結束回中央函式
  } // 結束接近中央判斷

  if (distanceToCenter > 0) { // 如果角色位於畫面中央左側
    characterX += characterMoveSpeed; // 讓角色向右移動一小段
  } else { // 如果角色位於畫面中央右側
    characterX -= characterMoveSpeed; // 讓角色向左移動一小段
  } // 結束角色移動方向判斷

  constrainCharacterPosition(); // 限制角色不能超出畫布
} // 結束 moveCharacterToCenter 函式

function updateRunAnimation() { // 更新角色跑步動畫
  frameTimer++; // 增加跑步動畫計時器

  if (frameTimer >= frameInterval) { // 如果計時器達到動畫切換時間
    currentFrame = (currentFrame + 1) % runFrameCount; // 切換到下一格跑步動畫並循環播放
    frameTimer = 0; // 將動畫計時器歸零
  } // 結束跑步動畫切換判斷
} // 結束 updateRunAnimation 函式

function drawCharacter() { // 繪製角色目前動畫
  const movingLeft = keyIsDown(LEFT_ARROW); // 判斷是否按住左方向鍵
  const movingRight = keyIsDown(RIGHT_ARROW); // 判斷是否按住右方向鍵
  const isMoving = movingLeft !== movingRight; // 只要按住單一方向鍵就播放跑步動畫
  const sprite = isMoving ? runSprite : stopSprite; // 移動時使用跑步圖，停止時使用待機圖
  const frameCount = isMoving ? runFrameCount : stopFrameCount; // 取得目前精靈圖的動畫格數

  if (!isImageReady(sprite)) { // 如果目前精靈圖尚未載入完成
    return; // 暫停繪製避免錯誤
  } // 結束精靈圖載入判斷

  const safeFrame = constrain(currentFrame, 0, frameCount - 1); // 將動畫格索引限制在有效範圍內
  const frameData = getFrameData(sprite, frameCount, safeFrame); // 取得目前動畫格資料
  const displayHeight = height * characterHeightRatio; // 設定角色顯示高度為畫布高度的五分之一
  const displayWidth = displayHeight * frameData.sourceWidth / frameData.sourceHeight; // 依原始比例計算角色顯示寬度

  constrainCharacterPosition(); // 限制角色不能超出畫布
  drawCharacterFrame(sprite, frameData, displayWidth, displayHeight, characterX, characterY, facingLeft); // 繪製角色動畫格
} // 結束 drawCharacter 函式

function drawCharacterFrame(sprite, frameData, displayWidth, displayHeight, drawX, drawY, shouldFaceLeft) { // 在指定位置繪製角色動畫格
  push(); // 儲存目前畫布繪圖設定
  translate(drawX, drawY); // 將繪圖原點移動到角色中心
  if (shouldFaceLeft) { // 如果角色需要面向左方
    scale(-1, 1); // 將角色圖片水平翻轉
  } // 結束圖片翻轉判斷
  image(sprite, -displayWidth / 2, -displayHeight / 2, displayWidth, displayHeight, frameData.sourceLeft, 0, frameData.sourceWidth, frameData.sourceHeight); // 繪製精靈圖中的單一動畫格
  pop(); // 還原畫布繪圖設定
} // 結束 drawCharacterFrame 函式

function getCurrentCharacterWidth() { // 取得目前角色顯示寬度
  const movingLeft = keyIsDown(LEFT_ARROW); // 判斷是否按住左方向鍵
  const movingRight = keyIsDown(RIGHT_ARROW); // 判斷是否按住右方向鍵
  const isMoving = movingLeft !== movingRight; // 判斷目前是否正在移動
  const sprite = isMoving ? runSprite : stopSprite; // 取得目前使用的精靈圖
  const frameCount = isMoving ? runFrameCount : stopFrameCount; // 取得目前動畫格數

  if (!isImageReady(sprite)) { // 如果目前精靈圖尚未載入完成
    return width * 0.05; // 回傳安全的預設寬度
  } // 結束精靈圖載入判斷

  const frameData = getFrameData(sprite, frameCount, currentFrame); // 取得目前動畫格資料
  const displayHeight = height * characterHeightRatio; // 取得角色目前顯示高度
  return displayHeight * frameData.sourceWidth / frameData.sourceHeight; // 依照原始比例回傳角色寬度
} // 結束 getCurrentCharacterWidth 函式

function constrainCharacterPosition() { // 限制角色中心位置不超出畫布
  const characterWidth = getCurrentCharacterWidth(); // 取得目前角色顯示寬度
  characterX = constrain(characterX, characterWidth / 2, width - characterWidth / 2); // 限制角色水平中心位置
  characterY = constrain(characterY, height * characterHeightRatio / 2, height - height * characterHeightRatio / 2); // 限制角色垂直中心位置
} // 結束 constrainCharacterPosition 函式

function getBackgroundScrollRatio() { // 計算背景目前的相對捲動比例
  if (backgroundMaxX === backgroundMinX) { // 如果背景沒有可移動範圍
    return 1; // 回傳固定比例
  } // 結束背景範圍判斷
  return (backgroundX - backgroundMinX) / (backgroundMaxX - backgroundMinX); // 回傳背景由左至右的相對位置
} // 結束 getBackgroundScrollRatio 函式

function getFrameData(sprite, frameCount, frameIndex) { // 取得精靈圖目前動畫格資料
  if (!isImageReady(sprite) || frameCount <= 0) { // 如果圖片尚未載入或動畫格數無效
    return null; // 回傳無效資料
  } // 結束圖片資料判斷

  const safeFrame = constrain(floor(frameIndex), 0, frameCount - 1); // 將動畫格索引限制在有效範圍
  const sourceLeft = floor(safeFrame * sprite.width / frameCount); // 計算動畫格左側來源座標
  const sourceRight = floor((safeFrame + 1) * sprite.width / frameCount); // 計算動畫格右側來源座標
  const sourceWidth = max(1, sourceRight - sourceLeft); // 計算動畫格來源寬度
  const sourceHeight = max(1, sprite.height); // 取得動畫格來源高度

  return { sourceLeft: sourceLeft, sourceWidth: sourceWidth, sourceHeight: sourceHeight }; // 回傳動畫格資料
} // 結束 getFrameData 函式

function isImageReady(imageObject) { // 檢查圖片是否已載入完成
  return Boolean(imageObject && imageObject.width > 0 && imageObject.height > 0); // 回傳圖片是否有效
} // 結束 isImageReady 函式

function windowResized() { // 當瀏覽器視窗大小改變時執行
  const oldWidth = max(1, width); // 儲存調整前的畫布寬度
  const oldCharacterRatio = characterX / oldWidth; // 儲存角色調整前的水平比例位置

  resizeCanvas(windowWidth, windowHeight); // 將畫布調整為新的視窗大小
  updateLayout(); // 重新計算背景、角色大小與位置

  characterX = width * oldCharacterRatio; // 依照新畫面寬度恢復角色水平位置
  characterY = height * characterVerticalRatio; // 依照新畫面高度恢復角色垂直位置
  constrainCharacterPosition(); // 重新限制角色不能超出畫布
} // 結束 windowResized 函式

function keyPressed() { // 當鍵盤按鍵被按下時執行
  userStartAudio();

  if (keyCode === LEFT_ARROW || keyCode === RIGHT_ARROW) { // 如果按下左右方向鍵
    return false; // 防止瀏覽器執行預設捲動
  } // 結束方向鍵判斷

  return true; // 允許其他按鍵執行預設功能
} // 結束 keyPressed 函式