$(document).ready (function () { 
	var conf = {
		data: {
			boston: {
				type: d3.json,
				url: "data/boston.json",
				id: "boston",
				key: "Boundary",
				enumerator: "geometries",
				idProperty: function (a) { return "boston"; }
			},
			blockgroups: {
				type: d3.json,
				url: 'data/blockgroups.json',
				id: "blockgroups",
				key: "stdin",
				enumerator: "geometries",
				//idProperty: function (a) { return a.id; } 
			},
			grid: {
				type: d3.json,
				url: 'data/grid.json',
				id: "grid",
				key: "stdin",
				plot: "points",
				enumerator: "geometries",
				idProperty: "id"
			},
			roads: {
				type: d3.json,
				url: 'data/roads.json',
				id: "roads",
				key: "stdin",
				enumarator: "geometries",
				idProperty: "id"
			},
			neighborhoods: {
				type: d3.json,
				url: 'data/neighborhoods.json',
				id: "neighborhoods",
				key: "stdin",
				enumerator: "geometries",
				idProperty: "gid"
			},
			districts: {
				type: d3.json,
				url: 'data/police_districts.json',
				id: "districts",
				key: "stdin",
				enumerator: "geometries"
			},
			roads_fio: {
				type: d3.csv,
				url: 'data/roads.fio.csv',
				id: "roads_fio",
				processor: function (rows) { 
					var nest = new Nestify (rows, ["id"], ["total", "asian", "black", "black", "white", "hispanic", "indian_american", "middle_easter", "unknown"]).data,
						total = nest.minmean (function (a) { return parseInt (a.values.total.value); }),
						white = nest.minmean (function (a) { return parseInt (a.values.white.value); }),
						black = nest.minmean (function (a) { return parseInt (a.values.black.value); }),
						hispanic = nest.minmean (function (a) { return parseInt (a.values.hispanic.value); }),
						scale = { 
							total: d3.scale.sqrt ().domain (total).range ([1, 4]),
							white: d3.scale.sqrt ().domain (white).range ([1, 4]),
							black: d3.scale.sqrt ().domain (black).range ([1, 4]),
							hispanic: d3.scale.sqrt ().domain (hispanic).range ([1, 4]),
						};
					return {data: nest, scale: scale}
				}
				
			},
			incidents_grid: {
				type: d3.csv,
				url: 'data/incidents.grid.csv',
				id: "incidents_grid",
				processor: function(rows) { 
					var nest = new Nestify (rows, ["grid"], ["inv", "arr"]).data,
						arr = nest.minmean (function (a) { return parseInt (a.values.arr.value); }),
						inv = nest.minmean (function (a) { return parseInt (a.values.inv.value); }),
						scale = {
							arr: d3.scale.sqrt ().domain (arr).range ([0.5, 3]), 
							inv: d3.scale.sqrt ().domain (inv).range ([0.5, 3])
						}; 

					return {data: nest, scale: scale}
				}
			}
		},
		prequantifiers: {
			categorize: function (args) { 
				return {}
			},
			population: function (args) { 
				console.log (args);
			}
		},
		quantifiers: {
			maps: { 
				fio: function (p /* a road segment */, a /*arguments*/, d /*prequantified data*/) {
					var osm_id = p.properties.id;
					var fio_data = this.data.roads_fio.data [osm_id];
					var type = a.type ? a.type : "total";
					if (fio_data) {
						 var sc = d3.scale.quantize ().domain (this.data.roads_fio.scale [type].domain ()).range ([1, 2, 3, 4]);

						 return {"class": "fio road fio_" + sc (fio_data [type].value), "stroke-width": "4"}
					}
					
				},
				incidents: function (p, a, d) { 
					var d = this.data.incidents_grid;
					var gid = p.properties.id;
					if (d.data [gid]) {
						var val = Math.floor (d.scale [a.type] (d.data [gid][a.type].value));
						var sc = d3.scale.quantize ().domain (d.scale [a.type].domain ()).range ([1, 2, 3, 4]);
						return {"r": val, "class": "incidents incidents_" + sc (d.data [gid][a.type].value)}
					} 
				},
				categorize: function (p, a, z) { 
					if (a == "neighborhoods") { 
						var name = p.properties.name.replace(/\//, '_').replace (/\s/,'_').toLowerCase ();
						return {"class": "neighborhood neighborhood_" + name + " neighborhood_" + p.properties.gid }
					}

					var x = p.properties, 
						white = x.w * 100, black = x.b * 100, opoc = x.p * 100, poc = opoc + black, total = (x.w + x.b + x.p),
						scale = d3.scale.quantize ().domain ([0, 100]).range ([1,2,3,4]),
						cls = "blockgroup population black_" + scale (black / total) + " white_" + scale (white / total) + " opoc_" + scale (opoc / total) 
							+ " poc_" + scale (poc / total);

					return {"class": cls}

				},
				population: function (x, args, d) { 
					//return {"class": "a1-4"}
				}
			},
			bars: { 
			},
			lines: {
			}

		}
	};
	var d = new Ant (conf); 
});
