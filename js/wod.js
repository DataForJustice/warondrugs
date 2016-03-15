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
			incidents_grid: {
				type: d3.csv,
				url: 'data/incidents.grid.csv',
				id: "incidents_grid",
				processor: function(rows) { 
					var nest = new Nestify (rows, ["grid"], ["inv", "arr"]).data,
						arr = nest.minmean (function (a) { return parseInt (a.values.arr.value); }),
						inv = nest.minmean (function (a) { return parseInt (a.values.inv.value); }),
						scale = {
							arr: d3.scale.sqrt ().domain (arr).range ([0, 4]), 
							inv: d3.scale.sqrt ().domain (inv).range ([0, 4])
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
				incidents: function (p, a, d) { 
					var d = this.data.incidents_grid;
					var gid = p.properties.id;
					if (d.data [gid]) {
						var val = Math.floor (d.scale [a.type] (d.data [gid][a.type].value));
						var sc = d3.scale.quantize ().domain (d.scale [a.type].domain ()).range ([1, 2, 3, 4]);
						return {"r": val, "class": "incidents_" + sc (d.data [gid][a.type].value)}
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
