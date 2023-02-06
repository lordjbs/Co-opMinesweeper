abstract class Renderer {
    public static drawBackground(): void {
        gameCanvasContext.clearRect(0, 0, gameCanvas.width, gameCanvas.height);

        gameCanvasContext.beginPath();
        gameCanvasContext.lineWidth = 2;
        gameCanvasContext.strokeStyle = "rgba(255, 255, 255, 1)";

        for (let xIndex: number = 1, line: number = 0; line < 32; xIndex += 32, line++) {
            gameCanvasContext.moveTo(xIndex, 0);
            gameCanvasContext.lineTo(xIndex, 514);
        }

        for (let yIndex: number = 1, line: number = 0; line < 18; yIndex += 32, line++) {
            gameCanvasContext.moveTo(0, yIndex);
            gameCanvasContext.lineTo(962, yIndex);
        }

        gameCanvasContext.stroke();
    }

    public static renderMouseMove(field: Field): void {
        // Optimization: if the mouse moved but it is still in the same filed we don’t need to draw anything so just stop the function
        if (field === previousActiveField) {
            return;
        }

        if (previousActiveField) {
            mouseCanvasContext.clearRect(previousActiveField.startX, previousActiveField.startY, 30, 30);
        }

        previousActiveField = field;

        mouseCanvasContext.fillStyle = "rgba(255, 255, 255, 0.5)";
        mouseCanvasContext.fillRect(field.startX, field.startY, 30, 30);
    }

    // todo: Definitely move this method in some other helper for the client only
    public static drawAffectedFields(affectedFields: Field[]): void {
        for (let i: number = 0, len: number = affectedFields.length; i < len; i++) {
            const field: Field = affectedFields[i];

            // Reset field
            gameCanvasContext.clearRect(field.startX, field.startY, 30, 30);

            if (field.flag) {
                gameCanvasContext.drawImage(flagImage, field.startX, field.startY);
                continue;
            }

            if (!field.revealed) {
                continue;
            }

            if (field.type === FieldType.Bomb) {
                Renderer.fillField(field, "rgba(255, 0, 0, 1)");

                gameCanvasContext.drawImage(bombImage, field.startX, field.startY);
            } else if (field.type === FieldType.Number) {
                Renderer.fillField(field, this.calculateColor(field));

                // Determine number color
                var numberColor = "";
                console.log(field.number)
                switch(field.number) {
                    case 1:
                        numberColor = "rgb(0,0,253)";
                        break;
                    case 2:
                        numberColor = "rgb(1,126,0)";
                        break;
                    case 3:
                        numberColor = "rgb(254,0,0)";
                        break;
                    case 4:
                        numberColor = "rgb(1,1,128)";
                        break;
                    case 5:
                        numberColor = "rgb(130,0,2)";
                        break;
                    case 6:
                        numberColor = "rgb(0,128,128)";
                        break;
                    case 7:
                        numberColor = "rgb(0,0,0)";
                        break;
                    case 8:
                        numberColor = "rgb(128,128,128)";
                        break;
                }

                console.log(numberColor)
                gameCanvasContext.fillStyle = numberColor;
                gameCanvasContext.font = "20px Arial Black, Helvetica, sans-serif";
                gameCanvasContext.fillText(`${field.number}`, field.startX + 9, field.startY + 23);
            } else {
                Renderer.fillField(field, this.calculateColor(field)); //rgb(234, 221, 202)
            }
        }
    }
    
    public static calculateColor(field: Field): string {
        var color = "";

        if(field.row % 2 == 0) {
            if(field.column % 2 == 0) {
                return "rgba(234, 221, 202, 1)"
            } else {
                return "rgba(212, 200, 182, 1)"
            }
        } else {
            if(field.column % 2 == 0) {
                return "rgba(212, 200, 182, 1)"
            } else {
                return "rgba(234, 221, 202, 1)"
            }
        }

        return color;
    }

    public static fillField(field: Field, fillStyle: string): void {
        gameCanvasContext.fillStyle = fillStyle;
        gameCanvasContext.fillRect(field.startX, field.startY, 30, 30);
    }

    public static drawMouse(position: MousePosition): void {
        otherMouseCanvasContext.clearRect(0, 0, otherMouseCanvas.width, otherMouseCanvas.height);

        const field: Field = FieldHelper.getField(position.x, position.y);
        otherMouseCanvasContext.fillStyle = "rgba(255, 255, 255, 0.5)";
        otherMouseCanvasContext.fillRect(field.startX, field.startY, 30, 30);

        otherMouseCanvasContext.drawImage(cursorImage, position.x, position.y);
    }
}
