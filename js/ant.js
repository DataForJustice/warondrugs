/*
* Augmented Narrative Toolkit
* Paola Villarreal, 2016.
* paw@paw.mx
*/


ant = {};
ant.charts = {};
/*
* Coordinator. 
* This object coordinates all the interactions in the layout. 
* Initializes the scrolls, the slides, carousels, charts (including maps)
*/
function Ant (conf) {
	this.conf = conf;
	this.charts = {};
	this.chartTypes = {};
	this.scroll = {};
	this.currentScene = null;
	this.currentElement = null;
	this.dataOrder = [];
	this.medium = {};
	this.slides = {};

	this.data = {};

	this.init ();
	return this;
}
Ant.prototype = {
	constructor: Ant,
	/*
	* Init.
	* Parses the configuration: the first task will be to download the data and then init the sliding, the scrolls and the controls.
	*/
	init: function () {
		// TODO define priorities
		if (this.conf.data) {
			var q = queue ();
			for (c in this.conf.data) {
				var d = this.conf.data [c];
				q.defer (d.type, d.url)
				this.dataOrder.push (d.id);
			}
			q.await ($.proxy (this.dataCallback, this));
		} else {
			this.dataCallback ();
		}
		this.initSlides ();
	},
	/*
	* dataCallback.
	* Receives the data in its arguments. 
	* Will initialize the maps and the charts.
	*/
	dataCallback: function () {
		this.initScroll ();
		this.initControls ();
		if (arguments.length > 0) {
			if (arguments [0]) {
				throw arguments [0];
			}
			for (var i = 1; i < arguments.length; i++) {
				var dataName = this.dataOrder [i-1];
				var conf = this.conf.data [dataName];
				if (conf) {
					var data = arguments [i];
					if (conf.processor) { 
						var ret = $.proxy (conf.processor, this) (arguments [i]);
						if (ret) { 
							data = ret;
						}
					}
					this.data [dataName] = data;
				}
			}
			this.initCharts ();
		}
	},
	/*
	* scrollProgress.
	* 
	*/
	scrollProgress: function (scene) {
	},
	scrollLeave: function (element) {
		//TODO test this code as it was migrated from this.maps to this.charts
		this.currentElement = null; 
		var controlMap = $(element).data ("control_map");
		if (controlMap) {
			var onClickLayer = $(element).data ("map_click_layer");
			var onClick = $(element).data ("map_click");
			if (onClick && onClickLayer) {
				this.charts [controlMap].topologies [onClickLayer].removeCallback ("click", this.onClick);
			}
		}
	},
	scrollEnter: function (element) {
		$(element.parentNode).children ().removeClass ("highlight");
		$(element).addClass ("highlight");
		this.parseElement (element);
		$(element).find ("form[data-control]").change ();
	},
	/*
	* getCallback
	* returns the callback that will be used 
	*/
	getCallback: function (cbName) {
		if (this.conf.callbacks && this.conf.callbacks [cbName]) {
			return this.conf.callbacks [cbName]; 
		}
	},
	/*
	* parseElement
	*/
	parseElement: function (element) {
		if (!element) throw "There is no element";
		/* 
		* Lets see what we have here: data? should we quantify something?
		*/
		var data;
		if (typeof element === 'string' || element.tagName) { // this is a string or an HTMLElement (check compatibility with other browsers)
			var id = $(element).attr ("id");
			data = $(element).data ();
		} else { 
			id = element.id;
			data = element;
		}
		var quantify = data.quantify;
		var quantifier = data.quantifier;
		var qArgs = data.quantifier_args;
		var controlChart = !data.control_chart ? id : data.control_chart;
		if (controlChart) { 
			var chartType = this.chartType (controlChart); 
			/*
			* If we have to quantify, lets prequantify :)
			*/
			if (quantify && quantifier) {
				var qObj = {fn: quantifier, ar: qArgs};
				try {
					qObj.data = this.prequantify (this.data [quantify], qObj);
					if (!qObj.data) qObj.data = this.data [quantify];
					if (chartType == "lines" || chartType == "bars" || chartType == "pie") {
						this.quantifyChart (controlChart, qObj);
					}
					if (chartType == "map") {
						this.quantifyMap (controlChart, quantify, qObj);
					}
				} catch (e) { console.log (e); console.log (e.stack); }
			}
			if (chartType == "lines" || chartType == "bars" || chartType == "pie") {
				this.parseChart (element, data);
			}
			/*
			* Chart: Map.
			*/
			if (chartType == "map") {
				this.parseMap (element, data);
			}
		}
		/*
		* Videos
		*/
		if (data.control_media) { 
			var m = this.medium [data.control_media];
			if (m) { 
				m.play (); m.pause ();  //this has to be done this way so popcornjs starts counting...
				if (data.media_play !== undefined) { 
					m.play ();
					m.muted (false);
				}
				if (data.media_stop !== undefined) { 
					m.pause ();
					m.currentTime (0);
				}
				if (data.media_time) {
					m.pause ();
					m.currentTime (data.media_time);
					m.play ();
				}
				if (data.media_pause !== undefined) {
					m.pause ();
				}
				if (data.media_mute !== undefined) {
					m.muted (true);
				}
				if (data.media_unmute !== undefined) { 
					m.muted (false);
				}
			}
		}
		/*
		* HTML element
		*/
		if (data.control_element) {
			var s = $(data.control_element);
			if (data.element_add_class) { s.addClass (data.element_add_class); }
			if (data.element_remove_class) { s.removeClass (data.element_remove_class); }
			if (data.element_hide !== undefined) { s.hide (); }
			if (data.element_show !== undefined) { s.show (); }
			if (data.element_attrs) { s.attr (data.element_attrs); 
				if (data.element_attrs === Object (data.element_attrs)) { 
					data.element_attrs = JSON.stringify (val);
					s.attr (data.element_attrs);
				}
			}
			if (data.text) { s.text (data.text); }
		}
		/*
		* Callback
		*/
		if (data.callback) {
			var cb = this.data.callbacks [data.callback]
			if (cb) {
				try { 
					cb.apply (this, [data.callback_args]);
				} catch (e) { 
					console.log ("error in callback: " + e);
				}
			}
		}
		/*
		* Hide and show.
		*/
		if (data.hide !== undefined) {
			if (data.hide == "") { 
				$(element).hide (); $(element).css ("visibility", "hidden"); 
			} else { 
				var x = data.hide.split (",");
				for (var d in x) { 
					$("#" + x [d]).hide (); 
					$("#" + x [d]).css ("visibility", "hidden"); 
				}
			}
		}
		if (data.show !== undefined) {
			if (data.show == "") { 
				$(element).show (); 
				$(element).css ("visibility", "visible"); 
			} else { 
				var x = data.show.split (",");
				for (var d in x) { 
					$("#" + x [d]).show (); 
					$("#" + x [d]).css ("visibility", "visible"); 
				}
			}
		}
		/*
		* Scroll control
		*/
		if (data.control_scroll != '' && this.scroll [data.control_scroll]) { 
			var scroll = this.scroll [data.control_scroll];
			if (data.scroll_to !== undefined) { 
				scroll.scrollTo (data.scroll_to);
			}
		}
		/*
		* Slide control
		*/
		if (data.control_slide != '' && this.slides [data.control_slide]) {
			if (data.scroll_to !== undefined) { 
				this.slides [data.control_slide].controller.scrollTo (this.slides [data.control_slide].slides [data.scroll_to]);
			}
		}
		/*
		* Other elements to parse
		*/
		if (data.parse) { 
			if (Array.isArray (data.parse)) { 
				for (var x in data.parse) { 
					this.parseElement (data.parse [x], false);
				}
			}
			else {
				var me = this;
				$(data.parse).each (function () { me.parseElement.apply (me, [$(this) [0]], false); });
				/*
				var x = data.parse.split (",");
				for (var e in x) { 
					this.parseElement ("#" + x[e].trim (), false);
				}
				*/

			}
		}
		/*
		* IMPORTANT! DO not put any more code here as we need to make sure that the other elements are parsed after everything else, to avoid weird behaviour. 
		*/
	},
	prequantify: function (data, quantifier) {
		if (!data) throw "No data... " + quantifier;
		if (this.conf.prequantifiers) {
			var pq = quantifier ? this.conf.prequantifiers [quantifier.fn] : null;
			if (pq) { 
				return pq.apply (this, [quantifier.ar]);
			}
		}
	},
	parseChart: function (element, data) {
		var id = $(element).attr ("id");
		var controlChart = data.control_chart ? data.control_chart : id;
		if (!controlChart) throw "No control_chart defined in element: " + element;
		var highlight = data.highlight;
		if (highlight) { 
			this.charts [controlChart].removeClass (".highlight", "highlight");
			this.charts [controlChart].addClass (data.highlight, "highlight");
		}
	},
	/*
	*
	*/
	parseMap: function (element, data) {
		var id = $(element).attr ("id");
		var controlChart = data.control_chart ? data.control_chart : id;
		if (!controlChart) throw "No control_chart defined in element: " + element;

		if (data.clear) {
			var layers = data.clear.split(',');
			for (var l in layers) {
				this.quantifyMap (controlChart, layers [l.trim()]);
			}
		}
		var zoomTo = data.zoom_to;
		var zoomLevel = data.zoom_level; 
		if (zoomTo) {
			this.charts [controlChart].zoomTo (zoomTo, zoomLevel);
		} else if (zoomLevel) {
			this.charts [controlChart].setScale (zoomLevel); 
		}
		if (data.select) { 
			if (data.select_add_class) { 
				this.charts [controlChart].addClass (data.select, data.select_add_class);
			}
			if (data.select_remove_class) { 
				this.charts [controlChart].removeClass (data.select, data.select_remove_class);
			}
		}
		var highlight = data.highlight;
		if (highlight) { 
			this.charts [controlChart].removeClass (".highlight", "highlight");
			this.charts [controlChart].addClass (data.highlight, "highlight");
		}

	},
	/*
	* quantiyChart:
	* 	starts up the quantifying process by calling the charts native 'redraw' method with the quantifier.
	*	Arguments:
	*		chart: string, the chart container's id.
	*		quantify: string, the key found in the 'data' config object 
	*		quantifier: object, the function that is going to quantify it and its arguments.
	*/
	quantifyChart: function (chart /* where is it going to be displayed*/, quantifier /* who is going to quantify it */) {
		var chartType = this.chartType (chart);
		if (this.conf.quantifiers && this.conf.quantifiers [chartType]) {
			var q = quantifier ? this.conf.quantifiers [chartType] [quantifier.fn] : null;
		}
		if (!q && quantifier) throw "No quantifier found: " + chartType + " " + quantifier.fn;
		var qn = quantifier ? {fn: q, context: this, args: quantifier.ar, data: quantifier.data} : null;
		this.charts [chart].redraw (quantifier.data, qn);
		this.charts [chart].on ("click", function (a, id, x, el) { this.parseElement (el); }, this); 
		this.charts [chart].on ("mouseover", function (a, id, x, el) { this.parseElement (el); }, this); 
		this.charts [chart].on ("mouseout", function (a, id, x, el) { this.parseElement (el); }, this); 
	},
	quantifyMap: function (map, layer, quantifier) {
		if (this.conf.quantifiers && this.conf.quantifiers ["maps"]) {
			var q = quantifier ? this.conf.quantifiers ["maps"] [quantifier.fn] : null;
		}
		var l = this.conf.data [layer];
		if (!q && quantifier) throw "No quantifier found: " + quantifier.fn;
		if (!l) throw "No data found: " + layer;

		var qn = quantifier ? {fn: q, context: this, args: quantifier.ar, data: quantifier.data} : null;
		if (!this.charts [map].topologies[layer]) throw "No layer: "+layer + " for map: " + map;

		/*
		* This is where the difference between maps and normal charts resides: maps have different layers and we just want to quantify one of them here.
		*/
		var plot = l.plot ? l.plot : "lines"
		var l = this.charts [map].topologies [layer];
		l.redraw (this.setFeatureId (this.conf.data [layer]), qn, plot);
		l.on ("click", function (a, id, x, el) { this.parseElement (el); }, this); 
		l.on ("mouseover", function (a, id, x, el) { this.parseElement (el); }, this); 
		l.on ("mouseout", function (a, id, x, el) { this.parseElement (el); }, this); 
		this.charts [map].reZoom ();
	},
	setFeatureId: function (layer) {
		return function (x) { 
			var val = x.properties [layer.idProperty];
			if (typeof layer.idProperty === "function") {
				val = layer.idProperty (x); 
			}
			return layer.id + "_" + val;
		};
	},
	initControls: function () {
		$("form[data-control]").change({me: this},
			function (a) {
				var args = {};
				$.each ($(this).find (":input").serializeArray (), function (_, kv) { if (kv.value != "IGNORE") { args [kv.name] = kv.value; } });
				$(this).data ("quantifier_args", args);
				a.data.me.parseElement.apply (a.data.me, [this, false]);
			}
		);
		//TODO check if this is redundant from the method above
		$("select[data-control]").change ({me: this},
			function (a) {
				a.data.me.parseElement.apply (a.data.me, [$(this).children (":selected")]);
			}
		)
		$("a[data-control]").click ({me: this}, 
			function (a) { 
				var x = a.data.me;
				x.parseElement.apply (x, [this]);
			}
		);
		//$("[data-subscribe_media]").
		var cb = function (me) { 
			return function (r) { 
				me.addMedia.apply (me, [$(this) [0]]); 
			}
		};
		$("[data-media]").each (cb (this));
	},
	addMedia: function (elm) { 
		var id = elm.id;
		var data = $(elm).data ();
		var type = data.media;
		var x, alt;
		switch (type) {
			case 'youtube': x = new Popcorn.HTMLYouTubeVideoElement( elm ); break
			case 'vimeo': x = new Popcorn.HTMLVimeoVideoElement( elm ); break;
			case 'audio': x = "#" + id; break;
			case 'timer': alt = new Timefy (data.timer_args); break;
		}
		if (x) { 
			x.src = $(elm).data ("media_url");
			var media = new Popcorn (x);
			media.load ();
			var cb = function (context, obj, elm) { 
				return function (e) { 
					var currentSecond = Math.floor (obj.currentTime ());
					if (obj.currentSecond != currentSecond) {
						var parseCb = function (me) { 
							return function () { 
								me.parseElement.apply (me, [$(this) [0]]);
							} 
						}
						console.log (currentSecond);
						$("[data-subscribe_media='" + elm.id + "'][data-subscribe_time='" + currentSecond + "']").each (parseCb (context));
						obj.currentSecond = currentSecond;

					}

				}
			}
			media.on ("timeupdate", cb (this, media, elm));
			//TODO subscribers for play, stop, etc.

			this.medium [id] = media;
		} else if (alt) { 
			this.medium [id] = alt;
			alt.load ();
		}
	},
	chartType: function (chartName) {
		return this.chartTypes [chartName];
	},
	initChart: function (element) { 
		var id = $(element).attr ('id');
		if (!this.charts [id]) {
			var data = $(element).data ();
			var dChart = data.chart;
			this.chartTypes [id] = dChart; 
			var obj;
			if (dChart == "map") {
				obj  = new ant.charts.map ("#" + id, $(element).width (), $(element).height ());
				obj.setCenter ({lat: data.map_center_lat, lon: data.map_center_lon});
				// TODO fix this following lines: the layers should be drawn by the quantifier.
				if (data.map_layers) { 
					var layers = data.map_layers.split (',');
					for (var a in layers) {
						var l = this.conf.data [layers [a]];
						var plot = l.plot ? l.plot : "lines";
						var topo = obj.addFeatures (l.id, this.data [l.id], l.key); 
						topo.redraw (this.setFeatureId (l), null, plot)
					}
				}
				this.charts [id] = obj;
				this.parseElement ("#" + id);
			}
			if (dChart == "bars" || dChart == "lines" || dChart == "pie") { 
				obj  = new ant.charts [dChart] (id, $(this).data ())	
				this.charts [id] = obj;
				this.parseElement ("#" + id);
			}
		} else {
			console.log ("Chart already exists: " + id);
		}
	},
	initCharts: function () {
		var m = this;
		$("[data-chart]").each (function (e) { m.initChart.apply (m, [$(this)]); });
	},
	initSlides: function () { 
		var slides = {};
		$("[data-slide]").each (function (i) { 
			var slide = $(this).data ("slide"); 
			if (!slides [slide]) slides [slide] = {};
			var id = $(this).attr ('id');
			slides [slide][id] = $(this) [0]; 
		});
		for (var c in slides) {
			var controller = new ScrollMagic.Controller ({
				globalSceneOptions: {
					triggerHook: 'onLeave'
				}
			});
			var scenes = {}
			for (var p in slides [c]) {
				var panel = slides [c] [p];
				var scene = new ScrollMagic.Scene ({ 
					triggerElement: panel
				})
				.setPin (panel)
				.addTo (controller);
				var cb = function (me) { return function (e) { me.parseElement.apply (me, [e.target.triggerElement ()]); } };
				scene.on ("enter", cb (this));
				var lv = function (me) { 
					return function (e) { 
						var d = $(e.target.triggerElement()).data ();
						if (d.slide_leave_parse !== undefined) { 
							var x = d.slide_leave_parse.split (',');
							for (a in x) { 
								me.parseElement.apply (me, ["#" + x [a]]);
							}
						}
					};
				};
				scene.on ("leave", lv (this));
				scenes [p] = scene;
			}
			this.slides [c] = {controller: controller, slides: scenes};
		}
	},
	initScroll: function () {
		var cb = function (me) { 
			return function () { 
				var id = $(this).attr ('id');
				var scroll = new Scenify ("#" + id);
				scroll.on ("scene_progress", $.proxy (me.scrollProgress, me));
				scroll.on ("scene_enter", $.proxy (me.scrollEnter, me));
				scroll.on ("scene_leave", $.proxy (me.scrollLeave, me));
				me.scroll [id] = scroll;
			};
		}
		$("[data-movie]").each (cb (this));
	}
};
function Timefy () { 
	this.init ();
	return this;
}
Timefy.prototype = {
	constructor: Timefy,
	init: function () {},
	load: function () {},
	play: function () {},
	stop: function () {}
}
function Chart (container, conf) {
	return this;
}
var asChart = function () {
	this.updateSize = function () { 
		var rect = this.container.node ().getBoundingClientRect ();
		this.width = rect.width - this.margin.left - this.margin.right;
		this.height = rect.height - this.margin.top - this.margin.bottom; 
		this.svg.attr ({"width": this.width + this.margin.left + this.margin.right, "height": this.height + this.margin.top + this.margin.bottom})
			.attr ("transform", "translate(" + this.margin.left + "," + this.margin.top + ")")
	}
	this.drawAxes = function (yScale) { 
		var yAxis = d3.svg.axis ()
				.scale (yScale)
				.orient ("right")
				.tickSize (this.width); 

		this.svg.selectAll ("g.axis").remove();
		var gy = this.svg.append ("g")
			.attr ("class", "y axis")
			.attr ("transform", "translate (0, " + this.margin.top + ")")
			.call (yAxis);

		gy.selectAll("text")
			.attr("x", 0)
			.attr("dy", -4);
	}
	this.quantifierCallback = function (quantifier, callback, innerCallback) {
		if (quantifier) {
			// this generates a callback that gives us the chance to edit every attribute in the chart element, and edit it with the users' values (class, degrees, x, y, etc).
			return function (selector, a, i) {  
				var qn = quantifier;
				if (Array.isArray(a)) { //no objects please, only arrays.
					var rets = [];
					// this is for a nested collection. It only supports the first two dimensions. AFAIK. 
					for (var d in a) { 
						var ret = qn.fn.apply (qn.context, [a [d], qn.args, qn.data]); //calls the users' callback for every item. 
						if (innerCallback) { 
							ret = innerCallback.apply (this, [ret]); // calls charts' "inner" callback with users' input.
						}
						rets.push (ret);
					}
					var attrs = callback.apply (this, [rets]); // calls charts' normal callback with the collected return values from the inner callback;
				} else if (callback) {
					var ret = qn.fn.apply (qn.context, [a, qn.args, qn.data]);
					var attrs = callback.apply (this, [ret]); 
				} else {
					var attrs = qn.fn.apply (qn.context [a, qn.args, qn.data]);
				}
				var data = attrs.data;
				attrs.data = null;
				d3.select (selector).attr (attrs);
				if (data) { 
					for (var d in data) { 
						var val = data [d];
						if (val === Object (val)) {
							val = JSON.stringify (val);
						}
						d3.select (selector).attr ("data-" + d, val);
					}
				}
			}
		}
		return function (selector, d) { d3.select (selector).attr ("class", ""); };
	}
	this.init = function (container, conf) {
		this.conf = conf;
		this.container = d3.select ("#" + container);
		this.margin = conf.margin ? conf.margin : {top: 0, right: 0, bottom: 0, left: 0};
		this.svg = this.container.append ("svg");
		this.updateSize ();

		return this;
	}
	this.addClass = function (sel, cls) { 
		this.svg.selectAll (sel).classed (cls, true);
	}
	this.removeClass = function (sel, cls) { 
		this.svg.selectAll (sel).classed (cls, false);
	}
	this.createCallback = function (type) {
		var me = this;
		return function () {
			var args = [];
			for (var a in arguments) {
				args.push (arguments [a]);
			}
			args.push (this);
			me.callback.apply (me, [type, args]);
		}
	}
	this.callbacks = {};
	this.on = function (ev, cb, scope) {
		if (!this.callbacks [ev]) {
			this.callbacks [ev] = [];
		}
		if (!scope) { scope = this; }
		this.callbacks [ev].push ({ scope: scope, callback: cb});	
	}
	this.removeCallback = function (ev, cb) {
		for (var x in this.callbacks [ev]) {
			if (this.callbacks [ev] [x].callback == cb) {
				this.callbacks [ev].splice (x, 1);
			}
		}
	}
	this.callback = function (ev, args) {
		if (!this.callbacks [ev]) return;
		for (cb in this.callbacks [ev]) {
			if (cb) { 
				var x = this.callbacks [ev][cb];	
				x.callback.apply (x.scope, args); 
			}
		}
	}
	return this;
}
var asBars = function () {
	this.redraw = function (d, quantifier) {
		this.callbacks = {};
		var data = d.data;
		d.scale.range ([0, this.height]);

		var barWidth = this.width / data.length;
		var chartHeight = this.height;
		var after = function (attrs) {
			var height = attrs === Number (attrs) ? attrs : attrs.height;
			if (isNaN (attrs.height)) attrs.height = 0;
			var calcY = chartHeight - attrs.height;
			if (isNaN (calcY)) calcY = 0;
			attrs.y = calcY;
			attrs.width = barWidth;

			return attrs;
		}
		var inner = function (ret) {  }
		var qn = this.quantifierCallback (quantifier, after, inner);  
		
		var margin = this.margin;
		this.svg.selectAll ("g").remove (); //HACK. Sucks. 
		var items = data;
		
		if (typeof data.items === "function") { 
			items = data.items ();
		}
		var bar = this.svg.selectAll ("g")
			.data (items);

		bar.enter ().append ("g")
			.attr ("transform", function (d, i) { return "translate(" + i * barWidth + ", " + margin.top + ")"; });	
		bar.append ("rect")
			.each (function (d, i) { qn (this, d, i); })
			.on ("click", this.createCallback ("click"))
			.on ("mouseover", this.createCallback ("mouseover"))
			.on ("mouseout", this.createCallback ("mouseout"))
			
	}
	return this;
}
ant.charts.bars = function (container, conf) { this.init (container, conf); }
asChart.call (ant.charts.bars.prototype);
asBars.call (ant.charts.bars.prototype);
var asLines = function () {
	this.redraw  = function (d, quantifier) { 
		var data = d.data;
		d.scale.range ([this.height, 0]); // this comes from the prequantifier and it is used by the quantifier 
		var lines = data; //TODO verify if this works with a single line..
		if (data.nests == 2) {
			lines = data.items ();
		}
		var itemsMax = d3.max (lines, function (l) { return l.values.length; });
		var pointDistance = this.width / itemsMax;
		var height = this.height;

		var after = function (container) { 
			return function (rets) { 
				var ys = [], rs = [];
				var attrs = {};
				var cHeight = height;
				for (var i in rets) {
					rets [i].y = cHeight - rets [i].y;
					ys.push (rets [i].y);
					rs.push (rets [i].r);
					rets [i].x = pointDistance * i;
					rets [i].cx = rets [i].x;
					rets [i].cy = rets [i].y;
					container.append ("circle").attr (rets [i]);
					rets [i].y = null;
				//	$.extend (attrs, rets);
				}
				var x = function (d, e) { return pointDistance * e; };
				var y = function (d, e) { return ys [e]; };
				var svgLine = d3.svg.line ().x (x).y (y);
				attrs.d = function (t) { return svgLine (ys) };  
				

				return attrs;
			}
		}
		//var qn = this.quantifierCallback (quantifier, after);

		var bar = this.svg.selectAll ("g")
			.data (lines);

		bar.enter ().append ("g")
			.attr ("transform", "translate (0, " + this.margin.top + ")")
			.on ("click", this.createCallback ("mouseover"))
			.on ("mouseover", this.createCallback ("mouseover"))
			.on ("mouseout", this.createCallback ("mouseout"));
		var quantifierCb = this.quantifierCallback; 
		bar.append ("path")
			.each (function (d, e) { 
				var qn = quantifierCb (quantifier, after (bar)); 
				qn (this, d.values, e);  
				var attrs = d.attrs;
				var data = attrs.data;
				attrs.data = null;
				d3.select (this).attr (d.attrs); 
				if (data) { 
					for (var d in data) { 
						var val = data [d];
						if (val === Object (val)) {
							val = JSON.stringify (val);
						}
						d3.select (this).attr ("data-" + d, val);
					}
				}
			})
	}
	return this;
}
ant.charts.lines = function (container, conf) { this.init (container,conf); }
asChart.call (ant.charts.lines.prototype);
asLines.call (ant.charts.lines.prototype);
//TODO refactor this.. :)
ant.charts.map = function (container, width, height) {
	this.scale = 100;
	this.translate = [width / 2, height / 2];
	this.refCenter = [.5, .5];
	this.translate = [width * this.refCenter [0], height * this.refCenter [1]]; 
	this.center = {lat: 34.5133, lon: -94.1629};
	this.width = width;
	this.height = height;
	this.container = container;
	this.topology = {};
	this.features = {};
	this.rateById = d3.map ();
	this.svg = d3.select (container).append ("svg").attr ("width", width).attr ("height", height); 
	this.topologies = {};
	this.projection = d3.geo.mercator ();
	this.redraw = function (topo, quantifier, plot) {
		if (!topo) {
			for (t in this.topologies) {
				this.redraw (t, quantifier, plot);
			}
			return;
		}
		this.topologies[topo].redraw (quantifier, plot);
	}
	this.setScaleAndCenter = function (s, c) {
		this.scale = s;
		this.center = c;
		this.redraw ();
	}
	this.setScale = function (s) {
		this.scale = s;
		this.redraw ();
	}
	this.setCenter = function (c) {
		this.center = c;
		this.redraw ();
	}
	this.getPath = function () {
		if (!this.center) throw "No center defined";
		//TODO accomodate the lack of center coordinate.
		this.projection
			.scale(this.scale)
			.rotate ([-this.center.lon, 0])
			.center ([0, this.center.lat])
			.translate (this.translate);

		return d3.geo.path ().projection (this.projection);
	}
	this.getArc = function () {
		return d3.geo.greatArc().precision(3);
	}
	/*
	this.lineConnectElements = function (elmA, elmB) {
		var path = this.getPath ();
		var arc = this.getArc ();
		var a = d3.select(elmA);

		var centroidA = path.centroid (a.datum ());
		var b = d3.select (elmB);
		var centroidB = path.centroid (b.datum ())
		var links = [];

		links.push ({"source": path.projection().invert (centroidA), "target": path.projection ().invert (centroidB)});
		var layer = this.svg.append ("g").attr ("class", "lineLayer");
		layer.append ("path")
			.data (links)
			.attr ("d", function (x) { return path(arc (x)); })
			.attr ("vector-effect", "non-scaling-stroke")
			.style ({'stroke-width': 1, 'stroke': '#B10000', 'stroke-linejoin': 'round', 'fill': 'none'})
	},
	*/
	this.zoomSelector = null,
	this.zoomContext = 20,
	this.reZoom = function () {
		if (this.zoomSelector != null) {
			this.zoomTo (this.zoomSelector, this.zoomContext);
		}
	},
	this.removeClass = function (selector, cls) { 
		this.svg.selectAll (selector).classed (cls, false);
	},
	this.addClass = function (selector, cls) { 
		this.svg.selectAll (selector).classed (cls, true);
	}
	this.zoomTo = function (selector, context) {
		if (!context) context = this.context 
		var e = this.svg.selectAll (selector);
		if (!e) throw "No element found: " + selector;
		this.zoomSelector = selector;
		this.zoomContext = context;
		var path = this.getPath ();
		var width = this.width;
		var height = this.height;
		var bounds = path.bounds(e.datum ()),
			dx = bounds[1][0] - bounds[0][0],
			dy = bounds[1][1] - bounds[0][1],
			x = (bounds[0][0] + bounds[1][0]) / 2,
			y = (bounds[0][1] + bounds[1][1]) / 2,
			scale = (context / 100) / Math.max(dx / width, dy / height),
			translate = [width * this.refCenter [0] - scale * x, height * this.refCenter [1] - scale * y];
		console.log ("w: " + width + " h:" + height + " rc0:" + this.refCenter [0] + " rc1:" + this.refCenter [1] + " x:" + x + " y:" + y + " scale:" +scale);
		console.log (selector +" " + Math.max ((dx / width), (dy / height)));

		this.svg
			.selectAll ("path")
			.attr ("vector-effect", "non-scaling-stroke")
			.attr ("transform", "translate(" + translate + ")scale(" + scale + ")");
		this.svg
			.selectAll ("text")
			.attr ("vector-effect", "non-scaling-stroke")
			.attr ("transform", "translate(" + translate + ")scale(" + scale + ")");
		this.svg
			.selectAll ("circle")
			.attr ("vector-effect", "non-scaling-stroke")
			.attr ("transform", "translate(" + translate + ")scale(" + scale + ")")
	}
	this.addFeatures = function (topo, collection, key, quantifier, plot) {
		if (!plot) plot = "lines"
		if (this.topologies [topo]) throw "A topology " + topo + " already exists.";
		if (collection && collection.objects) {
			var features = collection.objects [key];
			if (features) {
				this.svg.append ("g")
					.attr ("class", topo);
				this.topologies [topo] = new ant.charts.map.topology (this.svg, topo, this.getPath (), collection, features);
				this.redraw (topo, quantifier, plot);

				return this.topologies [topo];
			} else {
				throw "No Features found: (" + topo + ")" + key;
			}
		} else {
			throw "Empty features collections? " + topo;
		}
	}
	return this;
};
ant.charts.map.topology = function (cont, name, path, t, f) {
	this.container = cont;
	this.name = name;
	this.topology = t;
	this.features = f;
	this.path = path;
	this.redraw = function (setId, quantifier, plot) {
		this.callbacks = {};
		if (!plot) plot = "lines";
		this.container.select ("g." + this.name).selectAll ("text").remove ();
		var path = this.path;
		
		var qn = quantifier ? $.proxy (
				function (selector, d, plot) {  
					var attrs = quantifier.fn.apply (quantifier.context, [d, quantifier.args, quantifier.data])
					if (attrs) { 
						if (plot == "points") { 
							attrs.cx = path.centroid (d) [0];
							attrs.cy = path.centroid (d) [1];
						}
						if (attrs.text) {
							var xs = {"x": path.centroid (d)[0], "y": path.centroid (d)[1]};
							d3.select (selector.parentNode)
								.append ("svg:text")
								.attr (xs)
								.attr (attrs)
								.text (attrs.text);
						}
						// This section adds the data-* attributes returned from the quantifier to the element...!!! 
						// This allows the cascading of visualizations
						var data = attrs.data;
						attrs.data = null;
						selector.attr (attrs);
						if (data) { 
							for (var d in data) { 
								var val = data [d];
								if (val === Object (val)) { 
									val = JSON.stringify (val);
								}
								selector.attr ("data-" + d, val);
							}
						}
					}
				},
			quantifier) : function (selector, d) { selector.attr ("class", ""); };

		if (plot == "lines") {
			this.container.select ("g." + this.name).selectAll ("path")
				.data (topojson.feature (this.topology, this.features).features)
				.each (function (d) { qn (d3.select (this), d, plot); })
				.attr ("id", setId)
				.attr ("d", function (x) { return path (x); })
				.enter ()
				.append ("path")
				.on ("click", this.createCallback ("click"))
				.on ("mouseover", this.createCallback ("mouseover"))
				.on ("mouseout", this.createCallback ("mouseout"))
		}
		if (plot == "points") {
			this.container.select ("g." + this.name).selectAll ("circle")
				.data (topojson.feature (this.topology, this.features).features)
				.each (function (d) { qn (d3.select (this), d, plot); }) 
				.attr ("id", setId)
				.enter ()
				.append ("circle")
				.on ("click", this.createCallback ("click"))
				.on ("mouseover", this.createCallback ("mouseover"))
				.on ("mouseout", this.createCallback ("mouseout"))
		}
	}
	this.createCallback = function (type) {
		var me = this;
		return function () {
			var args = [];
			for (var a in arguments) {
				args.push (arguments [a]);
			}
			args.push (this);
			me.callback.apply (me, [type, args]);
		}
	}
	this.callbacks = {};
	this.on = function (ev, cb, scope) {
		if (!this.callbacks [ev]) {
			this.callbacks [ev] = [];
		}
		if (!scope) { scope = this; }
		this.callbacks [ev].push ({ scope: scope, callback: cb});	
	}
	this.removeCallback = function (ev, cb) {
		for (var x in this.callbacks [ev]) {
			if (this.callbacks [ev] [x].callback == cb) {
				this.callbacks [ev].splice (x, 1);
			}
		}
	}
	this.callback = function (ev, args) {
		if (!this.callbacks [ev]) return;
		for (cb in this.callbacks [ev]) {
			if (cb) { 
				var x = this.callbacks [ev][cb];	
				x.callback.apply (x.scope, args); 
			}
		}
	}
}
var asPie = function () {
	this.redraw = function (d, quantifier) { 
		var data = d.data;
		d.scale.range ([0, 365]);
		var cb = this.quantifierCallback (quantifier, function () { console.log (arguments); });

		var g = this.svg.selectAll(".arc")
			.data(data.items ())
			.enter().append("g")
			.each (function (d, e) {  cb (this, d.key, d.values, e); })
			.attr("class", "arc");

	}
	return this;
}
ant.charts.pie = function (container, conf) { this.init (container, conf); }
asChart.call (ant.charts.pie.prototype);
asPie.call (ant.charts.pie.prototype);
function Scenify (selector) {
	this.selector = selector;
	this.controller = new ScrollMagic.Controller ({addIndicators: false});
	this.controller.scrollTo (function (newpos) {
		window.scrollTo (0, newpos + 2);
	});
	this.callbacks = {
		scene: { progress: [], enter: [], leave: [] }
	};
	this.scenes = {};
	this.highlightedElements = {};
	this.init ();
	return this;
}
//TODO Refactor and paramaterize this... 
Scenify.prototype = {
	constructor: Scenify,
	init: function () {
		$(this.selector).children ().each ($.proxy (function (index, child) {
			var sceneElement = $(child);
			var sceneData = sceneElement.data ();
			var hook = sceneData.scene_trigger ? sceneData.scene_trigger : 0.15;
			var scene = new ScrollMagic.Scene ({triggerElement: child, tweenChanges: true, duration: sceneElement.height ()})
					.triggerHook (hook)
					//.addIndicators ()
					.addTo (this.controller);
			$(sceneElement).addClass ("scene");

			scene.on ("enter", $.proxy (this.enterCallback, this));
			scene.on ("leave", $.proxy (this.leaveCallback, this));
			scene.on ("progress", $.proxy (this.progressCallback, this));
			this.scenes [sceneElement.attr ('id')] = scene;

		}, this));
		return this;
	},
	scrollTo: function (sel) { 
		this.controller.scrollTo (this.scenes [sel]);
		this.trigger ("enter", this.scenes [sel]);
	},
	progressCallback: function (ev) { 
		if (ev.type == "progress") {
			var elm = ev.target.triggerElement ();
			this.trigger ("scene_progress", [elm, ev.progress]);
		}
	},
	enterCallback: function (ev) { 
		var elm = ev.target.triggerElement ();
		this.trigger ("scene_enter", [elm]);
	},
	leaveCallback: function (ev) {
		var elm = ev.target.triggerElement ();
		this.trigger ("scene_leave", [elm]);
	},
	trigger: function (eventName, args) {
		for (c in this.callbacks [eventName]) {
			var cb = this.callbacks [eventName] [c];
			cb.apply (this, args);
		}
	},
	on: function (eventName, callback) {
		if (!this.callbacks [eventName]) this.callbacks [eventName] = [];
		this.callbacks [eventName].push (callback);
		return this;
	}
};
function Nestify (data, keys, rollup, aggregator, interiorKey) {
	this.data = this.init (data, keys, rollup, aggregator, interiorKey);
	return this;
}
Nestify.prototype = {
	constructor: Nestify,
	init: function (data, keys, rollup, aggregator, interiorKey) {
		if (!data) throw "No data in nestify";
		var n = d3.nest ();
		if (keys) {
			for (x in keys) {
				var cb = function (k) { 
					return function (r) { if (interiorKey) { return interiorKey; } return r [k] }; 
				}
				n = n.key (cb (keys [x]));
			}
		}
		n = n.rollup (
			function (r) { 
				var obj = {}; 
				for (d in rollup) { 
					if (!aggregator) { 
						for (i in r) { 
							var a = r [i];
							if (!obj [rollup [d]]) obj [rollup [d]] = {};
							obj [rollup [d]] = a [rollup [d]];
						}
					} else { 
						var cb = function (col, intK) { 
							return function (a) { if (intK) { return  parseInt (a [intK]); } return parseInt (a [col]); }
						}
						if (interiorKey !== undefined) { 
							obj.value = aggregator (r, cb (rollup [d], interiorKey));
						} else {
							obj [rollup [d]] = aggregator (r, cb (rollup [d], interiorKey));
						}
					}

				} 
				return obj; 
			}
		);
		n = n.map (data);
		var summarize = function (leaf, key) {
			if (leaf) {
				var length = 0;
				var hasChildren = false;
				for (var k in leaf) { 
					if (leaf [k] === Object(leaf [k])) {
						var x = summarize (leaf [k], k);
						length ++;
						hasChildren = true;
					} else if (Array.isArray (leaf)) {
						length = leaf.length;
						//IMPORTANT: leaf [k] NEEDS to be an object so it can be used with values () and items (), etc. This is key.
						var col;
						if (interiorKey !== undefined) { 
							col = leaf [interiorKey];
							leaf = {};
						} else {
							col = leaf [k];
							leaf [col] = {};
						}
						hasChildren = false;
					} else {
						//LEAF at this point is key:value... where should we set it up?
						if (interiorKey !== undefined) {
							val = leaf [k] [interiorKey];
							leaf = {value: val}
						} else {
							var val = leaf [k];
							leaf [k] = {value: val}
						}

					}
				}
				if (!key) {
					leaf.nests = keys.length 
				}
				leaf.values = function () { var ks = []; for (var k in this) {if (this [k] === Object (this [k]) && typeof this [k] != "function") { ks.push (this [k]);} } return ks; }
				//TODO add keyName, this way we can match it to key == "2010" and keyName == "year" 
				leaf.items = function () { var ks = [];  for (var k in this) { if (this [k] === Object (this [k]) && typeof this [k] != "function") { ks.push ({key: k, values: this [k]}); } } return ks; }
				leaf.max = function (accessor) { return d3.max (this.items (), accessor); } 
				leaf.min = function (accessor) { return d3.min (this.items (), accessor); } 
				leaf.mean = function (accessor) { return d3.mean (this.items (), accessor); } 
				leaf.sum = function (accessor) { return d3.sum (this.items (), accessor); }
				leaf.extent = function (accessor) { return d3.extent (this.items (), accessor); } 
				leaf.minsum = function (accessor) { var t = this.items (); return [d3.min (t, accessor), d3.sum (t, accessor)]}
				leaf.minmean = function (accessor) { var t = this.items (); return [d3.min (t, accessor), d3.mean (t, accessor)]}
				leaf.meanmax = function (accessor) { var t = this.items (); return [d3.mean (t, accessor), d3.max (t, accessor)]}
				leaf.length = length;
				leaf.hasChilds = hasChildren;
				return leaf;
			}
		}
		n = summarize (n);

		return n;
	}
}
