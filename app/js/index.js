/*=========================================== imports start=========================================== */
import swal from "sweetalert2";
import Timer from "tiny-timer";
import Matic from "@maticnetwork/maticjs";
import Web3 from "web3";
import Network from "@maticnetwork/meta/network";
import $ from "jquery";
import EmbarkJS from "../../embarkArtifacts/embarkjs";
import token from "../../embarkArtifacts/contracts/ERC20";
import sablier from "../../embarkArtifacts/contracts/Sablier";
import utils from "web3-utils";
import bigNumber from "bignumber.js";
import "js-loading-overlay";
import ERC20 from "../../embarkArtifacts/contracts/ERC20";
/*=========================================== variables start=========================================== */
/*
// create network instance
const network = new Network(
    "testnet", "v1"
);

// Create sdk instance
const matic = new Matic({
  network: "testnet", // set network name
  version: "testv1", // set network version,

  // Set Matic provider - string or provider instance
  // Example: <network.Matic.RPC> OR new Web3.providers.HttpProvide(<network.Matic.RPC>)
  // Some flows like startExitFor[Metadata]MintableBurntToken, require a webSocket provider such as new web3 providers.WebsocketProvider('ws://localhost:8546')
  maticProvider: new Web3.providers.HttpProvider("http://localhost:8546"),

  // Set Mainchain provider - string or provider instance
  // Example: 'https://ropsten.infura.io' OR new Web3.providers.HttpProvider('http://localhost:8545')
  parentProvider: new Web3.providers.HttpProvider("http://localhost:8546"),
});

// init matic
matic.initialize();
console.log("matic: ", matic);

*/
EmbarkJS.enableEthereum();
var ownerAddress = "0x5F03294478c1184e38fefB2A6C088840D4aAFD25";
console.log("GAME_KEY: ", process.env.GAME_KEY);
var difficultyIncrementor = 2;
var level = 15;
var difficulty = 6;
var currentLevel = 0;
var currentTime = 60000 * 2;
var baseTimeAdder = 20000;
var collectedTime = 0;
var tokenToStream = 0;
localStorage.setItem("player", JSON.stringify({ levels: [], address: "" }));
var bonusCollected = false;
document.getElementById("level").innerHTML =
  "Current Level: " + currentLevel.toString();
document.getElementById("time").innerHTML =
  "Time Left: " + (currentTime / 1000).toFixed(0);
const timer = new Timer();

timer.on("tick", (ms) => {
  currentTime = ms;
  document.getElementById("time").innerHTML =
    "Time Left: " + (currentTime / 1000).toFixed(0) + " s";
});
timer.on("done", () => console.log("done!"));
timer.on("statusChanged", (status) => console.log("status:", status));

timer.start(currentTime);
/*=========================================== functions start=========================================== */
window.ethereum.on("accountsChanged", function(accounts) {});
window.ethereum.on("networkChanged", function(netId) {});
console.log('$("#button"): ', $("#button"));
$("#button").on("click", (e) => {
  timer.pause();
  console.log("in button");
  getUserAddress();
});
function showGameOver(address) {
  swal
    .fire({
      title: "Game Over!!",
      text: "Restart or Cash Out",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      cancelButtonText: "Restart",
      confirmButtonText: "Cash Out",
    })
    .then((result) => {
      if (result.value) {
        startTokenStream(address);
      } else {
        restart();
      }
    });
}
function successWithFooter(message, address) {
  swal
    .fire({
      icon: "success",
      title: "Shmoney",
      text: message,
      footer: `<a href=https://ropsten.etherscan.io/address/${address}>Click here</a>`,
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Close",
    })
    .then((result) => {
      if (result.value) {
        restart();
      }
    });
}

function errorWithOptions(mesage) {
  swal
    .fire({
      title: "Game Over!!",
      text: mesage,
      icon: "error",
      showCancelButton: false,
      confirmButtonColor: "#3085d6",
      confirmButtonText: "Continue",
    })
    .then((result) => {
      if (result.value) {
        continueTimer();
      }
    });
}
function startTokenStream(userAddress) {
  JsLoadingOverlay.show({
    spinnerIcon: "ball-running-dots",
  });
  var perRound = new bigNumber(100000).multipliedBy(new bigNumber(10).pow(18)); //@dev this is known i.e. decimal places
  var amount = perRound.multipliedBy(tokenToStream);
  var tempStartTime = Math.floor(
    new Date(new Date().getTime() + 30 * 60000).getTime() / 1000
  );
  var timeDelta =
    Math.floor(collectedTime / 1000) - Math.floor(new Date().getTime() / 1000);
  var endDate = tempStartTime + Math.floor(collectedTime / 1000);
  amount = calculateDeposit(timeDelta, amount);
  amount = amount.toFixed();
  console.log("user token payout: ", amount);

  console.log("timeDelta: ", timeDelta, " endDate: ", endDate);
  console.log("sablier", sablier);
  console.log(
    `userAddress,
  amount,
  ERC20.options.address,
  tempStartTime,
  endDate, ownerAddress: `,
    userAddress,
    amount,
    ERC20.options.address,
    tempStartTime,
    endDate,
    ownerAddress
  );
  sablier.methods
    .createStream(
      userAddress,
      amount,
      ERC20.options.address,
      tempStartTime,
      endDate
    )
    .send({
      gas: 6000000,
      from: ownerAddress,
    })
    .then((receipt, error) => {
      if (receipt) {
        successWithFooter(
          "Token stream has been initiated, and will start in 30 minutes, please check your balance your Amazeng token balance on Etherscan",
          userAddress
        );
      }
      console.log("receipt: ", receipt);
      console.log("error: ", error);
      JsLoadingOverlay.hide();
    })
    .catch((err) => {
      errorWithOptions(
        "Something went wrong please restart game and try again"
      );
      console.log("error starting token stream: ", err);
      JsLoadingOverlay.hide();
    });
}

function calculateDeposit(delta, deposit) {
  var diff = deposit.minus(deposit.minus(deposit.mod(delta)));
  deposit = new bigNumber(deposit).minus(diff);
  console.log("deposit.toFixed(): ", deposit.toFixed());
  return deposit;
}
function getUserAddress() {
  swal
    .mixin({
      input: "text",
      confirmButtonText: "Next &rarr;",
      showCancelButton: true,
      progressSteps: ["1", "2"],
    })
    .queue([
      {
        title: "Enter you Ethereum Address",
        text:
          "This is used to stream the time capsules collected during your play through",
      },
    ])
    .then((result) => {
      if (result.value) {
        const address = result.value[0];
        console.log("address: ", address);
        var isAddress = utils.isAddress(address);
        if (!isAddress) {
          showAddressError();
        } else {
          console.log("answers: ", address);
          if (collectedTime > 0) {
            startTokenStream(address);
          } else {
            showNoTokensCollectedError();
          }
        }
      } else {
        showAddressError();
      }
    });
}
function showAddressError() {
  swal
    .fire({
      title: "Invalid Address",
      text: "You entered an invalid ethereum address",
      icon: "warning",
      showCancelButton: false,
      confirmButtonColor: "#3085d6",
      confirmButtonText: "OK",
    })
    .then((result) => {
      if (result.isConfirmed) {
        getUserAddress();
      }
    });
}
function showNoTokensCollectedError() {
  swal
    .fire({
      title: "No Collected Tokens",
      text: "Seems like you havent collected any tokens",
      icon: "warning",
      showCancelButton: false,
      confirmButtonColor: "#3085d6",
      confirmButtonText: "Close",
    })
    .then((result) => {
      if (result.isConfirmed) {
        continueTimer();
      }
    });
}

function continueTimer() {
  timer.stop();
  timer.start(currentTime);
}
function success(title, message) {
  swal.fire(title, message, "success");
}
function updateTime(time) {
  console.log("updating time with: ", time);
  currentTime += time;
  console.log("new time: ", currentTime);
}
function rand(max) {
  return Math.floor(Math.random() * max);
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function changeBrightness(factor, sprite) {
  var virtCanvas = document.createElement("canvas");
  virtCanvas.width = 500;
  virtCanvas.height = 500;
  var context = virtCanvas.getContext("2d");
  context.drawImage(sprite, 0, 0, 500, 500);

  var imgData = context.getImageData(0, 0, 500, 500);

  for (let i = 0; i < imgData.data.length; i += 4) {
    imgData.data[i] = imgData.data[i] * factor;
    imgData.data[i + 1] = imgData.data[i + 1] * factor;
    imgData.data[i + 2] = imgData.data[i + 2] * factor;
  }
  context.putImageData(imgData, 0, 0);

  var spriteOutput = new Image();
  spriteOutput.src = virtCanvas.toDataURL();
  virtCanvas.remove();
  return spriteOutput;
}

function levelCompleted(moves) {
  timer.stop();
  swal
    .fire({
      title: "Level Completed",
      text: "You Moved " + moves + " Steps.",
      icon: "success",
      showCancelButton: false,
      confirmButtonColor: "#3085d6",
      confirmButtonText: "Continue",
    })
    .then((result) => {
      if (result.isConfirmed) {
        var temp = JSON.parse(localStorage.getItem("player"));
        temp.levels.push({
          level: currentLevel,
          time: currentTime,
          steps: moves,
          sablierTimeCollected: collectedTime,
          tokensCollected: tokenToStream,
        });
        currentTime += baseTimeAdder;
        localStorage.setItem("player", JSON.stringify(temp));
        difficulty += difficultyIncrementor;
        makeMaze();
        console.log("currentTime: ", currentTime);
        timer.start(currentTime);
      }
    });
}
function Maze(Width, Height) {
  var mazeMap;
  var width = Width;
  var height = Height;
  var startCoord, endCoord, randCoord;
  var dirs = ["n", "s", "e", "w"];
  var modDir = {
    n: {
      y: -1,
      x: 0,
      o: "s",
    },
    s: {
      y: 1,
      x: 0,
      o: "n",
    },
    e: {
      y: 0,
      x: 1,
      o: "w",
    },
    w: {
      y: 0,
      x: -1,
      o: "e",
    },
  };

  this.map = function() {
    return mazeMap;
  };
  this.startCoord = function() {
    console.log("startCoord: ", startCoord);
    return startCoord;
  };
  this.endCoord = function() {
    return endCoord;
  };
  this.randCoord = function() {
    return randCoord;
  };
  function genMap() {
    var mazeMap = new Array(height);
    for (var y = 0; y < height; y++) {
      mazeMap[y] = new Array(width);
      for (var x = 0; x < width; ++x) {
        mazeMap[y][x] = {
          n: false,
          s: false,
          e: false,
          w: false,
          visited: false,
          priorPos: null,
        };
      }
    }
    return mazeMap;
  }

  function defineMaze() {
    var isComp = false;
    var move = false;
    var cellsVisited = 1;
    var numLoops = 0;
    var maxLoops = 0;
    var pos = {
      x: 0,
      y: 0,
    };
    var numCells = width * height;
    while (!isComp) {
      move = false;
      mazeMap[pos.x][pos.y].visited = true;

      if (numLoops >= maxLoops) {
        shuffle(dirs);
        maxLoops = Math.round(rand(height / 8));
        numLoops = 0;
      }
      numLoops++;
      for (var index = 0; index < dirs.length; index++) {
        var direction = dirs[index];
        var nx = pos.x + modDir[direction].x;
        var ny = pos.y + modDir[direction].y;

        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          //Check if the tile is already visited
          if (!mazeMap[nx][ny].visited) {
            //Carve through walls from this tile to next
            mazeMap[pos.x][pos.y][direction] = true;
            mazeMap[nx][ny][modDir[direction].o] = true;

            //Set Currentcell as next cells Prior visited
            mazeMap[nx][ny].priorPos = pos;
            //Update Cell position to newly visited location
            pos = {
              x: nx,
              y: ny,
            };
            cellsVisited++;
            //Recursively call this method on the next tile
            move = true;
            break;
          }
        }
      }

      if (!move) {
        //  If it failed to find a direction,
        //  move the current position back to the prior cell and Recall the method.
        pos = mazeMap[pos.x][pos.y].priorPos;
      }
      if (numCells == cellsVisited) {
        isComp = true;
      }
    }
  }

  function defineStartEnd() {
    var toss = Math.round(Math.random() * 10293891083);
    if (toss % 2 === 0) {
      randCoord = {
        x: Math.round(Math.random() * height),
        y: Math.round(Math.random() * width),
      };
    } else {
      randCoord = {
        x: -1,
        y: -1,
      };
    }
    randCoord = {
      x: Math.round(Math.random() * height),
      y: Math.round(Math.random() * width),
    };
    switch (rand(4)) {
      case 0:
        startCoord = {
          x: 0,
          y: 0,
        };
        endCoord = {
          x: height - 1,
          y: width - 1,
        };

        break;
      case 1:
        startCoord = {
          x: 0,
          y: width - 1,
        };
        endCoord = {
          x: height - 1,
          y: 0,
        };
        break;
      case 2:
        startCoord = {
          x: height - 1,
          y: 0,
        };
        endCoord = {
          x: 0,
          y: width - 1,
        };
        break;
      case 3:
        startCoord = {
          x: height - 1,
          y: width - 1,
        };
        endCoord = {
          x: 0,
          y: 0,
        };
        break;
    }
  }

  var mazeMap = genMap();
  defineStartEnd();
  defineMaze();
}

function DrawMaze(Maze, ctx, cellsize, endSprite, timerSprite) {
  var map = Maze.map();
  var cellSize = cellsize;
  var drawEndMethod;
  ctx.lineWidth = cellSize / 40;

  this.redrawMaze = function(size) {
    cellSize = size;
    ctx.lineWidth = cellSize / 50;
    drawMap();
    drawEndMethod();
  };

  function drawCell(xCord, yCord, cell) {
    var x = xCord * cellSize;
    var y = yCord * cellSize;

    if (cell.n == false) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + cellSize, y);
      ctx.stroke();
    }
    if (cell.s === false) {
      ctx.beginPath();
      ctx.moveTo(x, y + cellSize);
      ctx.lineTo(x + cellSize, y + cellSize);
      ctx.stroke();
    }
    if (cell.e === false) {
      ctx.beginPath();
      ctx.moveTo(x + cellSize, y);
      ctx.lineTo(x + cellSize, y + cellSize);
      ctx.stroke();
    }
    if (cell.w === false) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + cellSize);
      ctx.stroke();
    }
  }

  function drawMap() {
    for (var x = 0; x < map.length; x++) {
      for (var y = 0; y < map[x].length; y++) {
        drawCell(x, y, map[x][y]);
      }
    }
  }

  function drawEndFlag() {
    var coord = Maze.endCoord();
    var gridSize = 4;
    var fraction = cellSize / gridSize - 2;
    var colorSwap = true;
    for (let y = 0; y < gridSize; y++) {
      if (gridSize % 2 == 0) {
        colorSwap = !colorSwap;
      }
      for (let x = 0; x < gridSize; x++) {
        ctx.beginPath();
        ctx.rect(
          coord.x * cellSize + x * fraction + 4.5,
          coord.y * cellSize + y * fraction + 4.5,
          fraction,
          fraction
        );
        if (colorSwap) {
          ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
        } else {
          ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        }
        ctx.fill();
        colorSwap = !colorSwap;
      }
    }
  }

  function drawEndSprite() {
    var offsetLeft = cellSize / 50;
    var offsetRight = cellSize / 25;
    var coord = Maze.endCoord();
    ctx.drawImage(
      endSprite,
      2,
      2,
      endSprite.width,
      endSprite.height,
      coord.x * cellSize + offsetLeft,
      coord.y * cellSize + offsetLeft,
      cellSize - offsetRight,
      cellSize - offsetRight
    );
  }
  function drawTimerSprite() {
    var offsetLeft = cellSize / 50;
    var offsetRight = cellSize / 25;
    var coord = Maze.randCoord();
    ctx.drawImage(
      timerSprite,
      2,
      2,
      timerSprite.width,
      timerSprite.height,
      coord.x * cellSize + offsetLeft,
      coord.y * cellSize + offsetLeft,
      cellSize - offsetRight,
      cellSize - offsetRight
    );
  }
  function clear() {
    var canvasSize = cellSize * map.length;
    ctx.clearRect(0, 0, canvasSize, canvasSize);
  }

  if (endSprite != null) {
    drawEndMethod = drawEndSprite;
  } else {
    drawEndMethod = drawEndFlag;
  }
  clear();
  if (Maze.randCoord().x > 0) {
    drawTimerSprite();
  }
  drawMap();
  drawEndMethod();
}

function Player(maze, c, _cellsize, onComplete, sprite = null) {
  var ctx = c.getContext("2d");
  var drawSprite;
  var moves = 0;
  drawSprite = drawSpriteCircle;
  if (sprite != null) {
    drawSprite = drawSpriteImg;
  }
  var player = this;
  var map = maze.map();
  var cellCoords = {
    x: maze.startCoord().x,
    y: maze.startCoord().y,
  };
  var cellSize = _cellsize;
  var halfCellSize = cellSize / 2;

  this.redrawPlayer = function(_cellsize) {
    cellSize = _cellsize;
    drawSpriteImg(cellCoords);
  };

  function drawSpriteCircle(coord) {
    ctx.beginPath();
    ctx.fillStyle = "yellow";
    ctx.arc(
      (coord.x + 1) * cellSize - halfCellSize,
      (coord.y + 1) * cellSize - halfCellSize,
      halfCellSize - 2,
      0,
      2 * Math.PI
    );
    ctx.fill();
    if (coord.x === maze.endCoord().x && coord.y === maze.endCoord().y) {
      onComplete(moves);
      player.unbindKeyDown();
    }
    if (
      coord.x !== -1 &&
      coord.x === maze.randCoord().x &&
      coord.y === maze.randCoord().y
    ) {
      bonusTime();
      console.log("collected collectible");
    }
    console.log("currentCoord: ", coord);
  }
  function getDuration(milli) {
    let minutes = Math.floor(milli / 60000);
    let hours = Math.round(minutes / 60);
    let days = Math.round(hours / 24);

    return (
      (days && { value: days, unit: "days" }) ||
      (hours && { value: hours, unit: "hours" }) || {
        value: minutes,
        unit: "minutes",
      }
    );
  }
  function bonusTime() {
    if (!bonusCollected) {
      bonusCollected = true;
      var bonusTimeCollected = Math.round(Math.random() * 604800000);
      var bonusTime = Math.round(Math.random() * 61000);
      console.log("bonusTime: ", bonusTime);
      tokenToStream += Math.round(Math.random() * 100000);
      currentTime += bonusTime;
      collectedTime += bonusTimeCollected;
      var time = getDuration(collectedTime);
      document.getElementById("tokensCollected").innerHTML =
        " Tokens Collected: " + tokenToStream;
      document.getElementById("timeCollected").innerHTML =
        "  Collected Time: " + time.value + " " + time.unit;
      $("#body")
        .fadeOut(100)
        .fadeIn(100);
    }
    timer.stop();
    timer.start(currentTime);
  }

  function drawSpriteImg(coord) {
    var offsetLeft = cellSize / 50;
    var offsetRight = cellSize / 25;
    ctx.drawImage(
      sprite,
      0,
      0,
      sprite.width,
      sprite.height,
      coord.x * cellSize + offsetLeft,
      coord.y * cellSize + offsetLeft,
      cellSize - offsetRight,
      cellSize - offsetRight
    );

    if (coord.x === maze.endCoord().x && coord.y === maze.endCoord().y) {
      onComplete(moves);
      player.unbindKeyDown();
    }
    if (
      coord.x !== -1 &&
      coord.x === maze.randCoord().x &&
      coord.y === maze.randCoord().y
    ) {
      bonusTime();
      console.log("collected collectible");
    }
    console.log("currentCoord: ", coord);
  }

  function removeSprite(coord) {
    var offsetLeft = cellSize / 50;
    var offsetRight = cellSize / 25;
    ctx.clearRect(
      coord.x * cellSize + offsetLeft,
      coord.y * cellSize + offsetLeft,
      cellSize - offsetRight,
      cellSize - offsetRight
    );
  }

  function check(e) {
    var cell = map[cellCoords.x][cellCoords.y];
    moves++;
    switch (e.keyCode) {
      case 65:
      case 37: // west
        if (cell.w == true) {
          removeSprite(cellCoords);
          cellCoords = {
            x: cellCoords.x - 1,
            y: cellCoords.y,
          };
          drawSprite(cellCoords);
        }
        break;
      case 87:
      case 38: // north
        if (cell.n == true) {
          removeSprite(cellCoords);
          cellCoords = {
            x: cellCoords.x,
            y: cellCoords.y - 1,
          };
          drawSprite(cellCoords);
        }
        break;
      case 68:
      case 39: // east
        if (cell.e == true) {
          removeSprite(cellCoords);
          cellCoords = {
            x: cellCoords.x + 1,
            y: cellCoords.y,
          };
          drawSprite(cellCoords);
        }
        break;
      case 83:
      case 40: // south
        if (cell.s == true) {
          removeSprite(cellCoords);
          cellCoords = {
            x: cellCoords.x,
            y: cellCoords.y + 1,
          };
          drawSprite(cellCoords);
        }
        break;
    }
  }

  this.bindKeyDown = function() {
    window.addEventListener("keydown", check, false);
    $("#view").on("swipe.up", (e) => {
      console.log("swiped up");
      check({
        keyCode: 38,
      });
    });

    $("#view").on("swipe.down", (e) => {
      check({
        keyCode: 40,
      });
    });

    $("#view").on("swipe.left", (e) => {
      check({
        keyCode: 37,
      });
    });

    $("#view").on("swipe.right", (e) => {
      check({
        keyCode: 39,
      });
    });
  };

  this.unbindKeyDown = function() {
    window.removeEventListener("keydown", check, false);
    $("#view").on("destroy", function(e) {
      e.stopPropagation();
      e.preventDefault();
    });
  };

  drawSprite(maze.startCoord());

  this.bindKeyDown();
}

var mazeCanvas = document.getElementById("mazeCanvas");
var ctx = mazeCanvas.getContext("2d");
var sprite;
var finishSprite;
var timerSprite;
var maze, draw, player;
var cellSize;
var difficulty;
// sprite.src = 'media/sprite.png';

window.onload = function() {
  let viewWidth = $("#view").width();
  let viewHeight = $("#view").height();
  if (viewHeight < viewWidth) {
    ctx.canvas.width = viewHeight - viewHeight / 100;
    ctx.canvas.height = viewHeight - viewHeight / 100;
  } else {
    ctx.canvas.width = viewWidth - viewWidth / 100;
    ctx.canvas.height = viewWidth - viewWidth / 100;
  }

  //Load and edit sprites
  var completeOne = false;
  var completeTwo = false;
  var completeThree = false;
  var isComplete = () => {
    if (completeOne && completeTwo && completeThree) {
      console.log("Runs");
      setTimeout(function() {
        makeMaze();
      }, 500);
    }
  };
  var sprite = new Image();
  timerSprite = new Image();
  timerSprite.src =
    "https://image.ibb.co/dr1HZy/Pf_RWr3_X_Imgur.png" +
    "?" +
    new Date().getTime();
  sprite.src =
    "https://image.ibb.co/dr1HZy/Pf_RWr3_X_Imgur.png" +
    "?" +
    new Date().getTime();
  sprite.setAttribute("crossOrigin", " ");
  sprite.onload = function() {
    sprite = changeBrightness(1.2, sprite);
    completeOne = true;
    console.log(completeOne);
    isComplete();
  };
  timerSprite.setAttribute("crossOrigin", " ");
  timerSprite.onload = function() {
    timerSprite = changeBrightness(1.2, sprite);
    completeThree = true;
    console.log(completeThree);
    isComplete();
  };
  finishSprite = new Image();
  finishSprite.src =
    "https://image.ibb.co/b9wqnJ/i_Q7m_U25_Imgur.png" +
    "?" +
    new Date().getTime();
  finishSprite.setAttribute("crossOrigin", " ");
  finishSprite.onload = function() {
    finishSprite = changeBrightness(1.1, finishSprite);
    completeTwo = true;
    console.log(completeTwo);
    isComplete();
  };
};

window.onresize = function() {
  let viewWidth = $("#view").width();
  let viewHeight = $("#view").height();
  if (viewHeight < viewWidth) {
    ctx.canvas.width = viewHeight - viewHeight / 100;
    ctx.canvas.height = viewHeight - viewHeight / 100;
  } else {
    ctx.canvas.width = viewWidth - viewWidth / 100;
    ctx.canvas.height = viewWidth - viewWidth / 100;
  }
  cellSize = mazeCanvas.width / difficulty;
  if (player != null) {
    draw.redrawMaze(cellSize);
    player.redrawPlayer(cellSize);
  }
};

function makeMaze() {
  currentLevel++;
  document.getElementById("level").innerHTML =
    "Current Level: " + currentLevel.toString();
  //document.getElementById("mazeCanvas").classList.add("border");
  if (player != undefined) {
    player.unbindKeyDown();
    player = null;
  }
  bonusCollected = false;
  cellSize = mazeCanvas.width / difficulty;
  maze = new Maze(difficulty, difficulty);
  draw = new DrawMaze(maze, ctx, cellSize, finishSprite, timerSprite);
  player = new Player(maze, mazeCanvas, cellSize, levelCompleted, sprite);
  if (document.getElementById("mazeContainer").style.opacity < "100") {
    document.getElementById("mazeContainer").style.opacity = "100";
  }
}
