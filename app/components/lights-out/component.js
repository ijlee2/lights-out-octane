import { action, set } from '@ember/object';
import { later } from '@ember/runloop';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';
import { copy } from 'ember-copy';

const MAX_MOBILE_SCREEN_SIZE = 480;
const MAX_TABLET_SCREEN_SIZE = 800;

export default class LightsOutComponent extends Component {
    @tracked containerSize;
    @tracked buttons;
    @tracked numButtons = {
        x: 5,
        y: 5
    };
    @tracked numMoves;

    constructor() {
        super(...arguments);

        /*
                   j  ->                                        (x)
                --------------------------------------------------------
             i  |          |          |          |          |          |
                |  (0, 0)  |  (0, 1)  |  (0, 2)  |  (0, 3)  |  (0, 4)  |
             |  |          |          |          |          |          |
             V  --------------------------------------------------------
                |          |          |          |          |          |
                |  (1, 0)  |  (1, 1)  |  (1, 2)  |  (1, 3)  |  (1, 4)  |
                |          |          |          |          |          |
                --------------------------------------------------------
                |          |          |          |          |          |
                |  (2, 0)  |  (2, 1)  |  (2, 2)  |  (2, 3)  |  (2, 4)  |
                |          |          |          |          |          |
                --------------------------------------------------------
                |          |          |          |          |          |
                |  (3, 0)  |  (3, 1)  |  (3, 2)  |  (3, 3)  |  (3, 4)  |
                |          |          |          |          |          |
                --------------------------------------------------------
                |          |          |          |          |          |
            (y) |  (4, 0)  |  (4, 1)  |  (4, 2)  |  (4, 3)  |  (4, 4)  |
                |          |          |          |          |          |
                --------------------------------------------------------
        */
        let buttons = [];

        for (let i = 0; i < this.numButtons.y; i++) {
            let rowOfButtons = [];

            for (let j = 0; j < this.numButtons.x; j++) {
                rowOfButtons.push({
                    coordinates: {
                        x: j,
                        y: i
                    },
                    isLightOn: false
                });
            }

            buttons.push(rowOfButtons);
        }

        this.buttons = buttons;
        this.numGamesWon = 0;
    }


    /*
        Define visual properties
    */
    @action setContainerSize(element) {
        const containerWidth = Math.min(element.clientWidth, 640);

        this.containerSize = {
            x: containerWidth,
            y: containerWidth
        };
    }

    get boardMargin() {
        const halfWidth = this.buttonStrokeWidth / 2;

        return {
            top: halfWidth,
            right: halfWidth,
            bottom: halfWidth,
            left: halfWidth
        };
    }

    get buttonStrokeWidth() {
        if (this.containerSize.x <= MAX_MOBILE_SCREEN_SIZE) {
            return 5;
        }

        if (this.containerSize.x <= MAX_TABLET_SCREEN_SIZE) {
            return 10;
        }

        return 10;
    }

    get boardSize() {
        return {
            x: this.containerSize.x - this.boardMargin.left - this.boardMargin.right,
            y: this.containerSize.y - this.boardMargin.top - this.boardMargin.bottom
        };
    }

    get buttonSize() {
        return {
            x: this.boardSize.x / this.numButtons.x,
            y: this.boardSize.y / this.numButtons.y
        };
    }

    get scaleX() {
        // Place points from left to right
        return scaleLinear()
            .domain([0, this.numButtons.x])
            .range([0, this.boardSize.x]);
    }

    get scaleY() {
        // Place points from top to bottom
        return scaleLinear()
            .domain([0, this.numButtons.y])
            .range([0, this.boardSize.y]);
    }


    /*
        Define the game logic
    */
    @action startGame() {
        this.numMoves = 0;
        this.buttons.forEach(rowOfButtons => {
            rowOfButtons.forEach(button => {
                set(button, 'isLightOn', false);
            });
        });

        this.createPuzzle();
        this.drawGame();
    }

    createPuzzle() {
        // Make the game harder with each win
        const maxNumMovesNeeded = 5 + this.numGamesWon;

        // Create a solvable puzzle by "walking backwards"
        for (let index = 0; index < maxNumMovesNeeded; index++) {
            const i = Math.floor(this.numButtons.y * Math.random());
            const j = Math.floor(this.numButtons.x * Math.random());

            this.toggleLights(i, j);
        }
    }

    toggleLights(i, j) {
        // Make a deep copy so that getters are recomputed
        let buttons = copy(this.buttons, true);

        // Center
        this.toggleLight(buttons[i][j]);

        // Top
        if (i > 0) {
            this.toggleLight(buttons[i - 1][j]);
        }

        // Bottom
        if (i < this.numButtons.y - 1) {
            this.toggleLight(buttons[i + 1][j]);
        }

        // Left
        if (j > 0) {
            this.toggleLight(buttons[i][j - 1]);
        }

        // Right
        if (j < this.numButtons.x - 1) {
            this.toggleLight(buttons[i][j + 1]);
        }

        this.buttons = buttons;
    }

    toggleLight(button) {
        set(button, 'isLightOn', !button.isLightOn);
    }

    get areLightsOut() {
        // If any of the lights are still on, the game continues
        return !this.buttons.any(rowOfButtons => {
            return rowOfButtons.any(button => button.isLightOn);
        });
    }


    /*
        Draw the game
    */
    @action drawGame() {
        this.createContainer();
        this.createGradients();
        this.createButtons();
    }

    createContainer() {
        // Clear the DOM
        document.getElementById('game').innerHTML = '';

        // Get visual properties
        const containerSize = this.containerSize;
        const boardMargin = this.boardMargin;

        // Create an SVG container
        let lightsOutContainer = select('#game')
            .append('svg')
            .attr('class', 'container')
            .attr('width', containerSize.x)
            .attr('height', containerSize.y)
            .attr('viewBox', `0 0 ${containerSize.x} ${containerSize.y}`)
            .attr('preserveAspectRatio', 'xMidYMin');

        this.lightsOutContainer = lightsOutContainer;

        // Create a board inside the container
        let lightsOutBoard = lightsOutContainer
            .append('g')
            .attr('class', 'board')
            .attr('transform', `translate(${boardMargin.left}, ${boardMargin.top})`);

        lightsOutBoard
            .append('g')
            .attr('class', 'buttons');

        this.lightsOutBoard = lightsOutBoard;
    }

    createGradients() {
        // Create light-off effect
        let linearGradient = this.lightsOutBoard
            .append('defs')
            .append('linearGradient')
            .attr('id', 'linear-gradient')
            .attr('x1', '0%')
            .attr('y1', '0%')
            .attr('x2', '0%')
            .attr('y2', '100%');

        linearGradient.append('stop')
            .attr('offset', '5%')
            .attr('stop-color', '#9688cc');

        linearGradient.append('stop')
            .attr('offset', '90%')
            .attr('stop-color', '#806fbc');

        // Create light-on effect
        let radialGradient = this.lightsOutBoard
            .append('defs')
            .append('radialGradient')
            .attr('id', 'radial-gradient');

        radialGradient.append('stop')
            .attr('offset', '5%')
            .attr('stop-color', '#eb71dc');

        radialGradient.append('stop')
            .attr('offset', '90%')
            .attr('stop-color', '#e64182');
    }

    createButtons() {
        // Get visual properties
        const buttonStrokeWidth = this.buttonStrokeWidth;
        const buttonSize = this.buttonSize;
        const scaleX = this.scaleX;
        const scaleY = this.scaleY;

        // It's easier to work with 1D data in D3. Convert the 2D array to an 1D array.
        const buttons = this.buttons.reduce((accumulator, rowOfButtons) => accumulator.concat(rowOfButtons), []);

        // Create buttons inside the buttons group
        let buttonGroup = select('.buttons')
            .selectAll('rect')
            .data(buttons);

        // Draw buttons
        buttonGroup
            .enter()
            .append('rect')
            .attr('width', buttonSize.x)
            .attr('height', buttonSize.y)
            .attr('stroke', '#cbd0d3')
            .attr('stroke-width', buttonStrokeWidth)
            .merge(buttonGroup)
            .attr('x', button => scaleX(button.coordinates.x))
            .attr('y', button => scaleY(button.coordinates.y))
            .attr('fill', button => button.isLightOn ? 'url(#radial-gradient)' : 'url(#linear-gradient)')
            .on('click', button => this.onButtonClick(button));
    }

    onButtonClick({ coordinates }) {
        if (this.areLightsOut) {
            return;
        }

        // Toggle lights
        const { x, y } = coordinates;
        this.toggleLights(y, x);

        // Restart game if the player won
        if (this.areLightsOut) {
            this.numGamesWon++;

            later(() => this.startGame(), 1500);

        // Otherwise, update the board
        } else {
            this.numMoves++;
            this.createButtons();

        }
    }
}