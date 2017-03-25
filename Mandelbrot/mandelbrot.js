//
let DEBUG = true;
//

class Renderer
{
	get size(){
		return this._size;
	}
	set size(o){
		this._size = o;
		this.center = {x: o.width / 2, y: o.height / 2};
	}
  constructor(scenes = {mainScene: nil, infoScene: nil, gridScene: nil }, size = {width: window.innerWidth-15, height: window.innerHeight-15})
  {
    let resize = (canvas, size) => {
      canvas.width = size.width;
      canvas.height = size.height;
    };

    let initCanvas = (canvas, size, zindex) => {
      resize(canvas, size);
      canvas.style.position = 'absolute';
      canvas.style.zIndex = zindex;
      document.body.appendChild(canvas);
      this.canvases.push(canvas);
    };

    let initScene = (scene) => {
      if(!scene) return;

      let index = this.scenes.length;
      this.scenes.push(scene);

      initCanvas(scene.canvas, this.size, index + 1);
      scene.initContext();
    };

    this.pos = {x:2.5e5, y:1.2e5, z:-5.8, scale: Math.exp(-5.8)};
    //this.pos = {x:0, y:0, z:0, scale: Math.exp(0)};
    this.mouse = {pos:{x:0, y:0}};
    this.size = size;
    //this.center = {x: size.width / 2, y: size.height / 2};
    this.canvases = [];
    this.scenes = [];

    this.mainScene = scenes.mainScene;
    this.infoScene = scenes.infoScene;
    initScene(scenes.mainScene);
    if(DEBUG){
      initScene(scenes.gridScene);
    }
    initScene(scenes.infoScene);

    window.addEventListener('mousemove', (e) => {
	  this.mouse.pos.x = e.layerX;
	  this.mouse.pos.y = e.layerY;
	  if(e.buttons === 1){
		this.pos.x += e.movementX / this.pos.scale;
		this.pos.y += e.movementY / this.pos.scale;
		window.dispatchEvent(new Event('redraw'));
	  }
	});

	window.addEventListener('wheel', (e) =>{
		this.pos.x += (this.center.x - e.layerX) / (this.pos.scale * 2);
		this.pos.y += (this.center.y - e.layerY) / (this.pos.scale * 2);

		this.pos.z -= e.wheelDelta / 1000;
		this.pos.scale = Math.exp(this.pos.z);

		window.dispatchEvent(new Event('redraw'));
	});

    window.addEventListener('resize', (e)=>{
      if(e.currentTarget != window) return;
      this.size = {width: window.innerWidth-15, height: window.innerHeight-15};
      //this.center = {x: this.size.width / 2, y: this.size.height / 2};
      window.dispatchEvent(new Event('redraw'));
      this.canvases.forEach(c => {
        resize(c, this.size);
        c.scene.initContext();
      });
    });
  }

	getReal(p, f){
		return (p - (f * this.pos.scale))* this.pos.scale;
	}

	getX(x){
		return this.getReal(x, this.pos.x);
	}

	getY(y){
		return this.getReal(y, this.pos.y);
	}


  render(){
    this.scenes.forEach(s => {
      s.draw(this);
    });
    window.requestAnimationFrame(this.render.bind(this, this.render));
  }
}

class Scene
{
  constructor(){
    this.canvas = document.createElement('canvas');
    this.canvas.scene = this;
    this.pos = {};
    this.redraw = true;
  }

  initContext(){
    this.context = this.canvas.getContext('2d');
  }

  clear(){
    this.context.clearRect(0,0, this.canvas.width, this.canvas.height);
  }

  scale(o){
    return o * this.pos.scale;
  }

  draw(controller){
    this.pos = controller.pos;
    this.scaled = {
      pos: {
        x: this.scale(this.pos.x),
        y: this.scale(this.pos.y),
        scale: this.pos.scale
      }
    };
    this.size = controller.size;
    this.clear();
  }
}

class Grid extends Scene{
  constructor(){
    super();
    window.addEventListener('redraw', (e) => this.redraw = true);
  }
  initContext(){
    super.initContext();
    this.context.globalCompositeOperation = 'difference';
    this.context.strokeStyle = 'whyte'
    this.context.shadowOffsetX = 0;
    this.context.shadowOffsetY = 0;
    this.context.shadowBlur = 0.5;
    this.context.shadowColor = 'rgba(80, 80, 80, 1)';
  }

  vLine(x){
    this.context.beginPath();
    this.context.moveTo(x, 0);
    this.context.lineTo(x, this.size.height);
    this.context.stroke();
  }

  hLine(y){
    this.context.beginPath();
    this.context.moveTo(0, y);
    this.context.lineTo(this.size.width, y);
    this.context.stroke();
  }

  grid(delta, dash, base = 0){
    let _dash = this.context.getLineDash();

    this.context.setLineDash(dash);

    for(let x=delta+base;this.center.x - x > 0;x+=delta){
      this.vLine(this.center.x - x);
      this.vLine(this.center.x + x);
    }

    for(let y=delta+base;this.center.y - y > 0;y+=delta){
      this.hLine(this.center.y - y);
      this.hLine(this.center.y + y);
    }

    this.context.setLineDash(_dash);
  }

  draw(controller){
    if(!this.redraw) return
    else this.redraw = false;

    super.draw(controller);
    this.size = controller.size;

    this.center = {x: this.size.width / 2, y: this.size.height / 2};

    this.vLine(this.center.x);
    this.hLine(this.center.y);

    this.grid(50, [2,4,4, 2]);
    this.grid(50, [1,8], -25);

    this.vLine(controller.pos.x);
    this.hLine(controller.pos.y);

    this.context.strokeRect(
      this.pos.x - this.scale(200),
      this.pos.y - this.scale(200),
      this.scale(400), this.scale(400)
    )

    //let t = new Hexagon(this.context, this.center, 400);
    //t.drawStroke();
  }
}

class Info extends Scene{
  constructor(){
    super();
  }

  initContext(){
    super.initContext();
    this.context.globalCompositeOperation = 'difference'
    this.context.font="18px Aria";
    this.context.fillStyle = 'white';
    this.context.shadowOffsetX = 0;
    this.context.shadowOffsetY = 0;
    this.context.shadowBlur = 0.5;
    this.context.shadowColor = 'rgba(80, 80, 80, 1)';
  }

  drawText(text, x, y){
    this.context.fillText(text, x, y);
    //this.context.strokeText(text, x, y);
  }

  draw(controller){
    super.draw(controller);
    let mousePos = controller.mouse.pos;

    let pos = controller.pos;

    let text = `Position   x: ${pos.x.toExponential(2)}, y: ${pos.y.toExponential(2)}, z: ${pos.z.toExponential(2)}, scale: ${pos.scale.toExponential(2)}`;
    this.drawText(text, 10, 24);

    text = `Mouse     x: ${mousePos.x}, y: ${mousePos.y}; x: ${controller.getX(mousePos.x).toExponential(2)}, y: ${controller.getY(mousePos.y).toExponential(2)}`;
    this.drawText(text, 10, 48);
  }
}

class Mandelbrot extends Scene{
  constructor(){
    super();
    window.addEventListener('redraw', (e) => this.redraw = true);
    this.alpha = 0.2;
    this.chest = [[]];
  }

  initContext(){
    super.initContext();
    //this.context.globalCompositeOperation = 'luminosity';
    //this.radius = 10;
  }

  draw(controller){
	if(!this.redraw) return;
	else this.redraw = false;

	super.draw(controller);

	var color = (x,y) =>{
		let formalX = controller.getX(x);
		let formalY = controller.getY(y);

		return this.polarCheck(formalX, formalY)
		  ? `rgba(0,0,0,0)`
		  : this.getColor(this.dummyCheck(formalX, formalY))
	}
	let radius = Math.min(controller.center.x, controller.center.y * SQRT3 / 2);
	var t = new Hexagon(this.context, controller.center, radius, color);
	//t.drawFill();
	Promise.all([t.drawFillAsync(3)]);
  }
  
  dummyCheck (p, q)
  {
    let xn = (x, y) => x*x - y*y + p;
    let yn = (x, y) => 2*x*y + q;

    let check = (x, y, i = 0) =>
    {
      if(i >= 0xFFF)
        return 0;

      return (x*x + y*y > 4)
          ? 0
          : 1 + check(xn(x,y), yn(x,y), ++i)
    }
    return check(p,q);
  }

  polarCheck (x, y){
    const squary = Math.pow(y, 2);
    var q = Math.pow((x - (1/4)), 2) + squary;
    return (q * (q + (x - 1/4))) < (squary / 4);
  }

  getColor(X){
    let r = X & 0xF00;
    let g = X & 0x0F0;
    let b = X & 0x00F;
    //return `rgb(${r},${g},${b})`;
    return `rgba(${r},${Math.trunc((r-g)/(b+g+1))*5},${b*3},${this.alpha})`;
    //return `rgb(${X},${X},${X})`;
  }
}

class Hexagon{
	constructor(context, point, pointOrRadius, colorFunction){
		this.context = context;
		if(typeof(pointOrRadius) == "number"){
			this.initByCenterAndRadius(point, pointOrRadius);
		}
		else{
			this.initByTwoPoint(point, pointOrRadius);
		}
		this.colorFunction = colorFunction;
		this.center.color = colorFunction
			? colorFunction(this.center.x, this.center.y)
			: "black";

		let f = (quarter) => {
			return {
				x: this.center.x + (quarter & 0x1001 ? 1 : -1) * this.radius / 2,
				y: this.center.y + (quarter & 0x1100 ? 1 : -1) * SQRT3 * this.radius / 2
			}
		}

		this.points =
			[
				this.center,
				{x:this.center.x + this.radius, y:this.center.y},
				f(0x1000),
				f(0x0100),
				{x:this.center.x - this.radius, y:this.center.y},
				f(0x0010),
				f(0x0001),
			];
	}

	initByCenterAndRadius(point, radius){
		this.center = point;
		this.radius = radius;
	}

	getCenter(point1, point2){
		return {
			x: Math.abs(point1.x + point2.x)/2,
			y: Math.abs(point1.y + point2.y)/2
		}
	}

	initByTwoPoint(point1, point2){
		this.center = this.getCenter(point1, point2);
		this.radius = Math.sqrt(
			  Math.pow(point1.x - point2.x, 2)
			+ Math.pow(point1.y - point2.y, 2)
		);
	}

	async drawFillAsync(depth = 1){
		if(depth == 0){
			return this.drawFill()
		}
		depth--;
		let radius = this.radius/2;
		await Promise.all([
			this.drawFill(),
			(new Hexagon(this.context, this.points[0], radius, this.colorFunction)).drawFill(),
			(new Hexagon(this.context, this.getCenter(this.points[1], this.points[2]), radius, this.colorFunction)).drawFillAsync(depth),
			(new Hexagon(this.context, this.getCenter(this.points[2], this.points[3]), radius, this.colorFunction)).drawFillAsync(depth),
			(new Hexagon(this.context, this.getCenter(this.points[3], this.points[4]), radius, this.colorFunction)).drawFillAsync(depth),
			(new Hexagon(this.context, this.getCenter(this.points[4], this.points[5]), radius, this.colorFunction)).drawFillAsync(depth),
			(new Hexagon(this.context, this.getCenter(this.points[5], this.points[6]), radius, this.colorFunction)).drawFillAsync(depth),
			(new Hexagon(this.context, this.getCenter(this.points[6], this.points[1]), radius, this.colorFunction)).drawFillAsync(depth)
		]);
	}

	async drawStrokeAsync(){
		let radius = this.radius/2;
		await Promise.all([
			this.drawStroke(),
			(new Hexagon(this.context, this.points[0], radius, this.colorFunction)).drawStroke(),
			(new Hexagon(this.context, this.getCenter(this.points[1], this.points[2]), radius, this.colorFunction)).drawStroke(),
			(new Hexagon(this.context, this.getCenter(this.points[2], this.points[3]), radius, this.colorFunction)).drawStroke(),
			(new Hexagon(this.context, this.getCenter(this.points[3], this.points[4]), radius, this.colorFunction)).drawStroke(),
			(new Hexagon(this.context, this.getCenter(this.points[4], this.points[5]), radius, this.colorFunction)).drawStroke(),
			(new Hexagon(this.context, this.getCenter(this.points[5], this.points[6]), radius, this.colorFunction)).drawStroke(),
			(new Hexagon(this.context, this.getCenter(this.points[6], this.points[1]), radius, this.colorFunction)).drawStroke()
		]);
	}

	drawStroke(){
		/* quarter
		*		Одна из четвертей координатной плоскости, которая обозначена четырёх битным флагом
		*	Первая четверть крайний левый бит
		*	Четвёртая четверть крайний правый бит
		*/
		let f = (quarter) => {
			return {
				x: this.center.x + (quarter & 0x1001 ? 1 : -1) * this.radius / 2,
				y: this.center.y + (quarter & 0x1100 ? 1 : -1) * SQRT3 * this.radius / 2
			}
		}
		let moveTo = (quarter) =>{
			let point = f(quarter);
			this.context.moveTo(point.x, point.y);
		}
		let lineTo = (quarter) =>{
			let point = f(quarter);
			this.context.lineTo(point.x, point.y);
		}
		let ctx = this.context;
		ctx.beginPath();
			moveTo(0x1000)
			lineTo(0x0100);
			lineTo(0x0001);
			ctx.lineTo(this.center.x + this.radius, this.center.y)
			ctx.lineTo(this.center.x - this.radius, this.center.y)
			lineTo(0x0010);
		ctx.closePath();
		ctx.stroke();
	}

	drawFill(){
		let f = (quarter) => {
			return {
				x: this.center.x + (quarter & 0x1001 ? 1 : -1) * this.radius / 2,
				y: this.center.y + (quarter & 0x1100 ? 1 : -1) * SQRT3 * this.radius / 2
			}
		}

		let p2pDraw = (point) => {
			let gradient = this.context.createRadialGradient(
				point.x, point.y, 0,
				point.x, point.y, this.radius);

			gradient.addColorStop(0.0, this.colorFunction(point.x, point.y));

			gradient.addColorStop(1.0, 'rgba(0,0,0,0)');

			this.context.fillStyle = gradient;

			let limit = (x, b) => {
				if(x<0) return 0
				return x > b ? b : x
			}

			let limitCoordinate = (point) =>{
				return {
					x:	limit(point.x, this.context.canvas.width),
					y:	limit(point.y, this.context.canvas.height)
				}
			}
			let a = limitCoordinate({x:point.x - this.radius,y:point.y - this.radius})
			let b = limitCoordinate({x:point.x + this.radius,y:point.y + this.radius})
			this.context.fillRect(a.x, a.y, b.x, b.y)
		}

		p2pDraw(this.center);
		p2pDraw(f(0x1000));
		p2pDraw(f(0x0100));
		p2pDraw(f(0x0010));
		p2pDraw(f(0x0001));
		p2pDraw({x:this.center.x + this.radius, y:this.center.y});
		p2pDraw({x:this.center.x - this.radius, y:this.center.y});
	}
}

let scenes = {
  mainScene: new Mandelbrot(),
  infoScene: new Info(),
  gridScene: DEBUG?new Grid(): null
};
let renderer = new Renderer(scenes);
renderer.render();
