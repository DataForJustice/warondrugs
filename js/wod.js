$(document).ready (function () { 
	var conf = {
		data: {
			boston: {
				type: d3.json,
				url: "/data/boston.json",
				id: "boston",
				key: "Boundary",
				enumerator: "geometries",
				idProperty: function (a) { return "boston"; }
			},
			blockgroups: {
				type: d3.json,
				url: '/data/blockgroups.json',
				id: "blockgroups",
				key: "stdin",
				enumerator: "geometries",
				//idProperty: function (a) { return a.id; } 
			},
			grid: {
				type: d3.json,
				url: '/data/grid.json',
				id: "grid",
				key: "stdin",
				plot: "points",
				enumerator: "geometries",
				idProperty: "id"
			},
			neighborhoods: {
				type: d3.json,
				url: '/data/neighborhoods.json',
				id: "neighborhoods",
				key: "stdin",
				enumerator: "geometries",
				idProperty: "gid"
			},
			districts: {
				type: d3.json,
				url: '/data/police_districts.json',
				id: "districts",
				key: "stdin",
				enumerator: "geometries"
			}
		},
		prequantifiers: {
			categorize: function (args) { 
				console.log (arguments);
				return {}
			},
			population: function (args) { 
				console.log (args);
			}
		},
		quantifiers: {
			maps: { 
				categorize: function (x, a, d) { 
					if (a == "grid") { 
					//	return {"r": 3}
					}
					console.log (arguments);	
				},
				population: function (x, args, d) { 
					return {"class": "a1-4"}
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
