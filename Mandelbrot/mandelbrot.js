let DEBUG = false;

class Renderer
{
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
    
    this.pos = {x:250000, y:120000, z:-5.8, scale: Math.exp(-5.8)};
    this.mouse = {pos:{x:0, y:0}};
    this.size = size;
    this.center = {x: size.x / 2, y: size.y / 2};
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
      this.pos.z -= e.wheelDelta / 1000;
      this.pos.scale = Math.exp(this.pos.z);
      
      
      window.dispatchEvent(new Event('redraw'));
    });
    
    window.addEventListener('resize', (e)=>{
      if(e.currentTarget != window) return;
      window.dispatchEvent(new Event('redraw'));
      
      this.size = {width: window.innerWidth-15, height: window.innerHeight-15};
      this.canvases.forEach(c => {
        resize(c, this.size);
        c.scene.initContext();
      });
    })    
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
    
    text = `Mouse     x: ${mousePos.x}, y: ${mousePos.y}`;
    this.drawText(text, 10, 48);
  }
}

class Mandelbrot extends Scene{
  constructor(){
    super();
    window.addEventListener('redraw', (e) => this.redraw = true);
    this.chest = [[]];
  }
  
  initContext(){
    super.initContext();
    this.radius = 5;
  }
  
  draw(controller){
    if(!this.redraw) return;
    else this.redraw = false;
    
    super.draw(controller); 
    this.context.fillStyle = 'black'
    this.context.fillRect(0,0, this.canvas.width, this.canvas.height);
    
    const step = 0.1;
    const k = this.size.height / this.size.width;
    for(let y = 0; y <= 1; y += this.radius / this.size.height)
      for(let x = 0; x <= 1; x += this.radius / this.size.width)
        this.drawPoint(x,y, 
                       this.scale(x * this.size.width - this.scaled.pos.x), this.scale(y * this.size.height - this.scaled.pos.y));
                       
    //this.context.fillRect(0,0, this.canvas.width, this.canvas.height);
  }  
   
  getChest(a,b){
    let result = this.chest[a];    
    if(typeof(result) == "undefined")
    {
      return null;
    }
    result = result[Math.abs(b)];
    if(typeof(result) == "undefined")
    {
      return null;
    }
    return result;
  }
  
  setChest(a,b,result){
    if(typeof(this.chest[a]) == "undefined")
    {
      this.chest[a] = {};      
    }
    this.chest[a][Math.abs(b)] = result;
    return result;
  }
  
  dummyCheck (p, q)
  {    
    let tmp = this.getChest(p,q)
      if(tmp != null){
        return tmp;
      }
    
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
    return this.setChest(p,q, check(p,q));    
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
    return `rgb(${r},${Math.trunc((r-g)/(b+g+1))*5},${b*3})`;
    //return `rgb(${X},${X},${X})`;
  }
  
  point(x, y, color) {
    let rx = x * this.size.width;
    let ry = y * this.size.height;    
    
    let gradient = this.context.createRadialGradient(rx, ry, 0, rx, ry, this.radius);
    gradient.addColorStop(0.3, color);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    this.context.fillStyle = gradient;
    
    this.context.fillRect(rx-this.radius, ry-this.radius, this.radius * 2, this.radius * 2 );
  }
  
  drawPoint(x, y, formalX, formalY)
  {    
    let color = this.polarCheck(formalX, formalY)
      ? 'black'
      : this.getColor(this.dummyCheck(formalX, formalY));

    this.point(x, y, color);    
  }  
}

if(DEBUG)
  console.log(`${window.innerWidth}x${window.innerHeight}`);

let scenes = {
  mainScene: new Mandelbrot(), 
  infoScene: new Info(),
  gridScene: DEBUG?new Grid(): null
};
let renderer = new Renderer(scenes);
renderer.render();
