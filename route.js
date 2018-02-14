'use strict';

app.directive('route', (Utils, $timeout) => {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      container: '<?container',
      segments: '<?segments',
      vehicle: '<?vehicle',
      setVehicle: '&setVehicle'
    },
    link: (scope) => {

      scope.isSmallDimension = () => window.innerWidth <= 1440;

      let drawAll = (anyway) => {
        
        // check if correct data passed
        if (!scope.vehicle && !scope.segments) return;
        
        // setup current segment based on input data
        let currentSegments = (scope.vehicle && !scope.vehicle.manual) ? {segments_data: scope.vehicle.segments} : scope.segments;
        
        // check if correct data passed
        if (!currentSegments || !currentSegments.segments_data) return;
        
        // check on difference detected
        if ((scope.segmentsLast || scope.vehicleLast) &&
          _.isEmpty(Utils.difference(scope.segmentsLast, currentSegments)) &&
          _.isEmpty(Utils.difference(scope.vehicleLast, scope.vehicle)) && !anyway) return;
        
        scope.vehicleLast = angular.copy(scope.vehicle);
        scope.segmentsLast = angular.copy(currentSegments);
        
        // define and use container on Konva Stage js
        let container = document.getElementById(scope.container);
        if (!container) return;
        let width = container.clientWidth * ((scope.isSmallDimension()) ? 1.42857142857 : 1);
        let height = container.clientHeight;
        let halfHeight = Math.floor(height / 3.5)+13;
        let stage = new Konva.Stage({
          container: scope.container,
          width: container.clientWidth,
          height: container.clientHeight
        });
        
        let colorOrders = angular.copy(Utils.colorsDefaultRange());
        let layer = new Konva.Layer();
        
        // waiting until all images will be loaded
        let imageObj = new Image();
        let downExpand = new Image();
        let geoEnd = new Image();
        let geoDepot = new Image();
        let toDepot = new Image();
        let imagesToLoad = [imageObj, downExpand, geoEnd, geoDepot, toDepot];
        let imagesLoaded = 0;
        imagesToLoad.forEach((value) => {
          value.onload = () => {
            imagesLoaded++;
            if(imagesLoaded == imagesToLoad.length){
              allLoaded();
              scope.allLoaded = true;
            }
          };
        });
        
        // configuring parameters for buckets and triangle height
        let bucketHeight = Math.floor(height / 8);
	      let simpleHeightPre = bucketHeight;
	      let simpleHeight = simpleHeightPre - 20;
        let bucketHeightPre = bucketHeight + 20;
        let triangleHeight = bucketHeightPre;
        let triangleHeightPre = triangleHeight + 20;
        let hoverId = null;
        let createColorIfNotIndex = (index) => {
          if (!colorOrders[index]) {
            colorOrders[index] = Utils.randomColor();
          }
        }
        
        // fire it when will be some changes to view or all loaded images done initial view
        let allLoaded = () => {
    
        	// draw car, line and end circle
        	
          let car = new Konva.Image({
            x: 5,
            y: halfHeight-13,
            image: imageObj,
            width: 47,
            height: 25
          });
    
          let routeLine = new Konva.Line({
            points: [55, halfHeight, width, halfHeight],
            stroke: 'white',
            strokeWidth: 1,
            dash: [5, 5]
          });
    
          let endCircle = new Konva.Circle({
            x: width,
            y: halfHeight,
            radius: 5,
            fill: 'white',
            strokeWidth: 2
          });
    
          layer.add(car);
    
          layer.add(routeLine);
    
          layer.add(endCircle);
    
          // also draw levels
          
          let triangleLine = new Konva.Line({
            points: [1, halfHeight-triangleHeightPre, width, halfHeight-triangleHeightPre],
            stroke: 'white',
            strokeWidth: 1,
            dash: [2, 2]
          });
    
          layer.add(triangleLine);
    
          layer.add(new Konva.Text({
            x: 1,
            y: halfHeight-triangleHeightPre+5,
            text: 'TRIANGLE LEVEL',
            fontSize: 12,
            fill: 'grey'
          }));
    
          let bucketLine = new Konva.Line({
            points: [1, halfHeight-bucketHeightPre, width, halfHeight-bucketHeightPre],
            stroke: 'white',
            strokeWidth: 1,
            dash: [2, 2]
          });
    
          layer.add(bucketLine);
    
          layer.add(new Konva.Text({
            x: 1,
            y: halfHeight-bucketHeightPre+5,
            text: 'BUCKET LEVEL',
            fontSize: 12,
            fill: 'grey'
          }));
	
	        let simpleLine = new Konva.Line({
		        points: [1, halfHeight-simpleHeightPre, width, halfHeight-simpleHeightPre],
		        stroke: 'white',
		        strokeWidth: 1,
		        dash: [2, 2]
	        });
	
	        layer.add(simpleLine);
	
	        layer.add(new Konva.Text({
		        x: 1,
		        y: halfHeight-simpleHeightPre+5,
		        text: 'SIMPLE LEVEL',
		        fontSize: 12,
		        fill: 'grey'
	        }));
    
          // main logic with segments
          
          let json = angular.copy(currentSegments);
          let segments = json.segments_data;
          
          // simple segment is must always
	        let isToDepot = (segment) => segment.kind === 7;
	        let isStartPoint = (segment) => segment.kind === -1 && segment.order_end.length === 0 && segment.order_start === null;
	        let isStartPointInitialized = (segment) => segment.kind === -1 && segment.order_end.length === 0 && segment.order_start === -1;
	        let foundToDepot = false;
	        let simpleSegment = {order_start: null, order_end:[], order_progress: [], simple: true};
	        let homeSegment = {kind: -1, order_start: null, order_end:[], order_progress: []};
	        let isHomeThisSegment = null;
	        let initFoundDepot = (toDepotIndex) => {
		        foundToDepot = true;
		        isHomeThisSegment = segments[toDepotIndex].order_end_data.vehicle_home;
		        segments.splice(toDepotIndex, 0, homeSegment);
		        segments.splice(toDepotIndex, 0, simpleSegment);
	        }
	        if (segments.length > 1) {
	          let toDepotIndex = _.findIndex(segments, isToDepot);
	          if (toDepotIndex >= 0) {
		          initFoundDepot(toDepotIndex);
	          } else {
	            segments.push(simpleSegment);
            }
          } else if (segments.length === 1) {
          	if (!isToDepot(segments[0])) {
		          segments[0].simple = true;
	          } else {
		          initFoundDepot(0);
	          }
          }
          if (foundToDepot) {
          	let foundHome = false;
          	segments.forEach((segment, index) => {
		          if (isToDepot(segment)) {
		          	segment.order_end.push(-1);
		          }
		          if (isStartPoint(segment)) {
		          	segment.order_start = -1;
		          	foundHome = true;
		          }
		        });
          }
          let simple = json.simple ? json.simple[0] : false;
          let bucketsData = json.bucket ? json.bucket : [];
          let triangleData = json.triangle ? json.triangle : [];
          if (!simple) {
            if (scope.vehicle.method_value==="simple") {
              simple = scope.vehicle;
            } else {
              if (scope.vehicle.segment_a && scope.vehicle.segment_b) {
                triangleData.push({data: scope.vehicle});
              } else {
                bucketsData.push({data: scope.vehicle});
              }
            }
          }
          let step = width / segments.length;
          let orders = [];
          
          // declare orders first if they are in progress in first segment
          segments.forEach((value) => {
            value.order_progress.forEach((orderId) => {
              orderId = parseInt(orderId);
              if (orders.indexOf(orderId) === -1) {
                orders.push(orderId);
              }
            });
          });
          
          // declare variables for segments draw (color, orderStep, rangeOrders)
          
          let orderStep = 17; let colorsOfOrders = {}; let rangeOrders = {};
          
          // draw texts of order id if they are in progress in first segment
          segments[0].order_progress.forEach((orderId, index) => {
            createColorIfNotIndex(index);
            colorsOfOrders[orderId] = colorOrders[index];
            rangeOrders[orderId] = index + 1;
            layer.add(new Konva.Text({
              x: 1,
              y: halfHeight + orderStep + (orderStep*rangeOrders[orderId]) - Math.floor(orderStep / 1.2),
              text: orderId,
              fontSize: 12,
              fill: colorsOfOrders[orderId]
            }));
          });
          
          // declare variables for hover functionality
          let buckets = []; let bucketIndexes = []; let triangles = []; let trianglesIndexes = []; let bucketSimple = [];
          
          // for timeline
          let totalDuration = 0; scope.selectedData = {};
          
          // clear all hover
          let clearAll = () => {
            buckets.forEach((bucket) => bucket.forEach((value) => value.hide()));
            triangles.forEach((triangle) => triangle.forEach((value) => value.hide()));
            bucketSimple.forEach((value) => value.hide());
          };
          
          // tooltip shapes declare
          let tooltip = new Konva.Text({
            text: "",
            fontSize: 13,
            lineHeight: 1.5,
            padding: 10,
            textFill: "white",
            fill: "white",
            alpha: 1,
            visible: false
          });
          let rect = new Konva.Rect({
            width: 300,
            height: 100,
            shadowColor: 'black',
            shadowBlur: 10,
            shadowOffset: [10, 10],
            shadowOpacity: 0.2,
            opacity: 0.8,
            visible: false
          });
          
          // draw all segments from start to end
          for (let i = 0; i < segments.length; i++) {
            let segment = segments[i];
            
            // calculations for each segment
            
            segment.startX = i * step;
            segment.endX = (i + 1) * step;
            
            // for timeline
            
            if (segment.duration) {
              totalDuration += segment.duration;
            }
            
            let segmentStartX = segment.startX;
            let segmentEndX = segment.endX;
            let halfOfSegment = Math.floor((segmentEndX - segmentStartX) / 2);
            let halfSegment = segmentStartX + halfOfSegment;
            
            /*layer.add(new Konva.Line({
              points: [segment.endX, halfHeight-bucketHeightPre, segment.endX, halfHeight+bucketHeightPre],
              stroke: 'red',
              strokeWidth: 1,
            }));*/
            
            // check if we need to draw a circle
            if (segment.order_start || segment.order_end.length) {
              let orderId = segment.order_start || parseInt(segment.order_end[0]);
              let orderIndex = orders.indexOf(orderId);
	            if (orderId === -1) {
		            colorOrders[orderIndex] = 'green';
	            } else createColorIfNotIndex(orderIndex);
	            
              // very important part of code - calculation of ranges current segment
              if (segment.order_start) {
                let currentRange = 0;
                if (segment.order_progress.length) {
                  let arrayRanges = [];
                  segment.order_progress.forEach((orderId) => {
                    arrayRanges.push(rangeOrders[parseInt(orderId)]);
                  });
                  currentRange = 1;
                  while (arrayRanges.indexOf(currentRange) >= 0) {
	                  currentRange++;
                  }
                }
                colorsOfOrders[orderId] = colorOrders[orderIndex];
                rangeOrders[orderId] = (currentRange>0) ? currentRange : 1;
              }
              if (segment.order_start) {
                // draw dash lines of segment start
              	layer.add(new Konva.Line({
                  points: [
                  	halfSegment, halfHeight,
	                  halfSegment, halfHeight + orderStep + (orderStep * rangeOrders[orderId])
                  ],
                  stroke: colorOrders[orderIndex],
                  strokeWidth: 1,
                  dash: [5, 5]
                }));
                layer.add(new Konva.Line({
                  points: [
                  	halfSegment, halfHeight + orderStep + (orderStep * rangeOrders[orderId]),
	                  halfSegment + halfOfSegment, halfHeight+orderStep + (orderStep * rangeOrders[orderId])
                  ],
                  stroke: colorOrders[orderIndex],
                  strokeWidth: 1,
                  dash: [5, 5]
                }));
                // draw order id text rotated
                layer.add(new Konva.Text({
                  x: halfSegment + ((orderId === -1) ? 0 : 8),
                  y: halfHeight+orderStep + (orderStep * rangeOrders[orderId]) + 5,
                  text: (orderId === -1) ? "TO " + (isHomeThisSegment ? "HOME" : "DEPOT") : orderId,
                  rotation: (orderId === -1) ? 0 : 90,
                  fontSize: 12,
                  fill: colorOrders[orderIndex]
                }));
              }
              if (segment.order_end.length) {
              	// draw dash lines of segment end
                layer.add(new Konva.Line({
                  points: [
                  	halfSegment, halfHeight + orderStep,
	                  halfSegment, halfHeight + orderStep + (orderStep * rangeOrders[orderId])
                  ],
                  stroke: colorOrders[orderIndex],
                  strokeWidth: 1,
                  dash: [5, 5]
                }));
                layer.add(new Konva.Line({
                  points: [
                  	halfSegment, halfHeight + orderStep + (orderStep * rangeOrders[orderId]),
	                  halfSegment-halfOfSegment, halfHeight +orderStep + (orderStep * rangeOrders[orderId])
                  ],
                  stroke: colorOrders[orderIndex],
                  strokeWidth: 1,
                  dash: [5, 5]
                }));
                if (isToDepot(segment)) {
                	segment.order_end = [];
                }
              }
	            if (!isToDepot(segment) && !isStartPointInitialized(segment)) {
		            // drawing circle end or start
		            let circleEndOrStart = new Konva.Circle({
			            x: halfSegment,
			            y: halfHeight,
			            radius: 15,
			            fill: 'black',
			            stroke: colorOrders[orderIndex],
			            strokeWidth: 6
		            });
		
		            // for showing tooltip
		            segment.color = colorOrders[orderIndex];
		            segment.clientEndOrStartId = circleEndOrStart._id;
		            circleEndOrStart.on("mousemove", () => {
			            let mousePos = stage.getPointerPosition();
			            mousePos.x = mousePos.x * ((scope.isSmallDimension()) ? 1.42857142857 : 1);
			            let mousePosX = mousePos.x < 160 ? 10 : ((mousePos.x > width - 160) ? width - 310 : (mousePos.x - 150));
			            tooltip.position({
				            x: mousePosX,
				            y: mousePos.y + (scope.isSmallDimension() ? 55 : 25)
			            });
			            rect.position({
				            x: mousePosX,
				            y: mousePos.y + (scope.isSmallDimension() ? 55 : 25)
			            });
			            let currentSegment = _.find(segments, {clientEndOrStartId: circleEndOrStart._id});
			            let isStartData = _.size(currentSegment.order_start_data);
			            let currentData = isStartData ? currentSegment.order_start_data : currentSegment.order_end_data;
			            let tooltipText = 'Client Name: ' + currentData.client + "\n";
			            tooltipText += (isStartData ? 'PU' : 'DO') + ' Address: ' + currentData.address + "\n";
			            tooltipText += 'Scheduled Time: ' + Utils.toStringDateTime(new Date(currentData.time), "MM/DD/YYYY h:mm A");
			            let resultTooltip = Utils.stripByLineBreak(tooltipText, 40);
			            let lines = resultTooltip.split('\n').length - 4;
			            tooltip.fontSize(13 - lines);
			            tooltip.text(resultTooltip);
			            tooltip.show();
			            rect.fill(currentSegment.color);
			            rect.show();
			            layer.draw();
			            stage.container().style.cursor = 'pointer';
		            });
		            circleEndOrStart.on("mouseout", () => {
			            tooltip.hide();
			            rect.hide();
			            layer.draw();
			            stage.container().style.cursor = 'default';
		            });
		            layer.add(circleEndOrStart);
		            // draw little circle above start end circle
		            layer.add(new Konva.Circle({
			            x: halfSegment,
			            y: halfHeight - 25,
			            radius: segment.order_end.length ? 4 : 6,
			            fill: colorOrders[orderIndex]
		            }));
		
		            // draw geo end image on end order marker
		            if (segment.order_end.length)
			            layer.add(new Konva.Image({
				            x: halfSegment - 7,
				            y: halfHeight - 53,
				            image: geoEnd,
				            width: 14,
				            height: 20
			            }));
		            // draw order index on roue timeline
		            let orderIndexId = (orderIndex + 1).toString();
		            let orderIdInClientEndOrStartId = new Konva.Text({
			            x: halfSegment - ((orderIndexId.length === 1) ? 3 : 6),
			            y: halfHeight - 6,
			            text: orderIndexId,
			            fontSize: 12,
			            fill: 'white'
		            });
		            segment.orderIdInClientEndOrStartId = orderIdInClientEndOrStartId._id;
		            orderIdInClientEndOrStartId.on("mousemove", () => {
			            let mousePos = stage.getPointerPosition();
			            mousePos.x = mousePos.x * ((scope.isSmallDimension()) ? 1.42857142857 : 1);
			            let mousePosX = mousePos.x < 160 ? 10 : ((mousePos.x > width - 160) ? width - 310 : (mousePos.x - 150));
			            tooltip.position({
				            x: mousePosX,
				            y: mousePos.y + (scope.isSmallDimension() ? 55 : 25)
			            });
			            rect.position({
				            x: mousePosX,
				            y: mousePos.y + (scope.isSmallDimension() ? 55 : 25)
			            });
			            let currentSegment = _.find(segments, {orderIdInClientEndOrStartId: orderIdInClientEndOrStartId._id});
			            let isStartData = _.size(currentSegment.order_start_data);
			            let currentData = isStartData ? currentSegment.order_start_data : currentSegment.order_end_data;
			            let tooltipText = 'Client Name: ' + currentData.client + "\n";
			            tooltipText += (isStartData ? 'PU' : 'DO') + ' Address: ' + currentData.address + "\n";
			            tooltipText += 'Scheduled Time: ' + Utils.toStringDateTime(new Date(currentData.time), "MM/DD/YYYY h:mm A");
			            let resultTooltip = Utils.stripByLineBreak(tooltipText, 40);
			            let lines = resultTooltip.split('\n').length - 4;
			            tooltip.fontSize(13 - lines);
			            tooltip.text(resultTooltip);
			            tooltip.show();
			            rect.fill(currentSegment.color);
			            rect.show();
			            layer.draw();
			            stage.container().style.cursor = 'pointer';
		            });
		            orderIdInClientEndOrStartId.on("mouseover", () => {
			            tooltip.show();
			            rect.show();
			            layer.draw();
			            stage.container().style.cursor = 'pointer';
		            });
		            layer.add(orderIdInClientEndOrStartId);
	            }
            }
            // draw dashes lines if orders are in progress in that segment
            if (segment.order_progress.length) {
              segment.order_progress.reverse().forEach((value) => {
                let orderId = parseInt(value);
                layer.add(new Konva.Line({
                  points: [
                  	halfSegment - halfOfSegment, halfHeight + orderStep + (orderStep*rangeOrders[orderId]),
	                  halfSegment + halfOfSegment, halfHeight + orderStep + (orderStep*rangeOrders[orderId])
                  ],
                  stroke: colorsOfOrders[orderId],
                  strokeWidth: 1,
                  dash: [5, 5]
                }));
              });
            }
          }
	
	        // show previews for buckets on background
          bucketsData.forEach((value) => {
            if (value.failures) return;
            let segment = segments.filter((item) => value.data.segment_a === item.segment)[0];
            let segmentStartX = segment.startX;
            let segmentEndX = segment.endX;
            let oneFourth = Math.floor((segmentEndX - segmentStartX) / 4);
            let halfOfSegment = segmentStartX + Math.floor((segmentEndX - segmentStartX) / 2);
            if (segment.order_end.length) halfOfSegment += oneFourth;
            if (segment.order_start || isToDepot(segment)) halfOfSegment -= oneFourth;
            layer.add(new Konva.Line({
              points: [
              	(segment.order_end.length) ? halfOfSegment : segmentStartX, halfHeight,
	              (segment.order_end.length) ? halfOfSegment : segmentStartX, halfHeight - bucketHeight,
	              (segment.order_start || isToDepot(segment)) ? halfOfSegment : segmentEndX, halfHeight - bucketHeight,
	              (segment.order_start || isToDepot(segment)) ? halfOfSegment : segmentEndX, halfHeight
              ],
              fillLinearGradientStartPoint: { x : segmentStartX, y : halfHeight - bucketHeight},
              fillLinearGradientEndPoint: { x : segmentStartX, y : halfHeight},
              fillLinearGradientColorStops: [0, '#576480', 1, 'transparent'],
              stroke: 'transparent',
              strokeWidth: 0,
              closed : true,
              opacity: 0.2
            }));
            layer.add(new Konva.Line({
              points: [
              	(segment.order_end.length) ? halfOfSegment : segmentStartX, halfHeight - bucketHeight,
	              (segment.order_end.length) ? halfOfSegment : segmentStartX, halfHeight - bucketHeightPre,
	              (segment.order_start || isToDepot(segment)) ? halfOfSegment : segmentEndX, halfHeight - bucketHeightPre,
	              (segment.order_start || isToDepot(segment)) ? halfOfSegment : segmentEndX, halfHeight - bucketHeight
              ],
              fill: '#576480',
              stroke: 'transparent',
              strokeWidth: 0,
              closed : true,
              opacity: 0.2
            }));
          });
	
	        // show previews for triangles on background
          triangleData.forEach((value) => {
            if (value.failures) return;
            let segmentStart = segments.filter((item) => item.segment === value.data.segment_a)[0];
            let segmentEnd = segments.filter((item) => item.segment === value.data.segment_b)[0];
            let segmentStartX = segmentStart.startX;
            let segmentEndX = segmentEnd.endX;
            // show previews
            layer.add(new Konva.Line({
              points: [
              	segmentStartX, halfHeight,
	              segmentStartX, halfHeight - triangleHeight,
	              segmentEndX, halfHeight - triangleHeight,
	              segmentEndX, halfHeight
              ],
              fillLinearGradientStartPoint: { x : segmentStartX, y : halfHeight-triangleHeight},
              fillLinearGradientEndPoint: { x : segmentStartX, y : halfHeight},
              fillLinearGradientColorStops: [0, '#576480', 1, 'transparent'],
              stroke: 'transparent',
              strokeWidth: 0,
              closed : true,
              opacity: 0.3
            }));
            layer.add(new Konva.Line({
              points: [
              	segmentStartX, halfHeight - triangleHeight,
	              segmentStartX, halfHeight - triangleHeightPre,
	              segmentEndX, halfHeight - triangleHeightPre,
	              segmentEndX, halfHeight - triangleHeight
              ],
              fill: '#576480',
              stroke: 'transparent',
              strokeWidth: 0,
              closed : true,
              opacity: 0.3
            }));
          });
    
          // triangles draw
          triangleData.forEach((value) => {
            if (value.failures) return;
            let segmentStart = segments.filter((item) => item.segment === value.data.segment_a)[0];
            let segmentEnd = segments.filter((item) => item.segment === value.data.segment_b)[0];
            let segmentStartX = segmentStart.startX;
            let segmentEndX = segmentEnd.endX;
            let halfOfSegment = Math.floor((segmentEndX - segmentStartX) / 2);
            let halfSegment = segmentStartX + halfOfSegment;
            // push all shapes for triangle
            let triangle = [];
            triangle.push(new Konva.Circle({
              x: segmentStartX,
              y: halfHeight,
              radius: 5,
              fill: 'green',
              strokeWidth: 2
            }));
            triangle.push(new Konva.Circle({
              x: segmentEndX,
              y: halfHeight,
              radius: 5,
              fill: 'green',
              strokeWidth: 2
            }));
            triangle.push(new Konva.Line({
              points: [
              	segmentStartX, halfHeight,
	              segmentStartX, halfHeight - triangleHeight,
	              segmentEndX, halfHeight - triangleHeight,
	              segmentEndX, halfHeight
              ],
              fillLinearGradientStartPoint: { x : segmentStartX, y : halfHeight - triangleHeight},
              fillLinearGradientEndPoint: { x : segmentStartX, y : halfHeight},
              fillLinearGradientColorStops: [0, 'green', 1, 'transparent'],
              stroke: 'green',
              strokeWidth: 1,
              dash: [2, 2],
              closed : true
            }));
            triangle.push(new Konva.Line({
              points: [
              	segmentStartX, halfHeight - triangleHeight,
	              segmentStartX, halfHeight - triangleHeightPre,
	              segmentEndX, halfHeight - triangleHeightPre,
	              segmentEndX, halfHeight - triangleHeight
              ],
              fill: 'green',
              stroke: 'green',
              strokeWidth: 1,
              dash: [2, 2],
              closed : true
            }));
            triangle.push(new Konva.Text({
              x: halfSegment - 25,
              y: halfHeight - triangleHeightPre + 10,
              text: 'ADD HERE',
              fontSize: 10,
              fill: 'white'
            }));
            triangle.push(new Konva.Image({
              x: halfSegment - 6,
              y: halfHeight - triangleHeight + 5,
              image: downExpand,
              width: 10,
              height: 12
            }));
            triangle.forEach((value) => {
              layer.add(value);
              value.hide();
            });
            triangles.push(triangle);
            let triangleHover = new Konva.Line({
              points: [
              	segmentStartX, halfHeight - triangleHeight,
	              segmentStartX, halfHeight - triangleHeightPre,
	              segmentEndX, halfHeight - triangleHeightPre,
	              segmentEndX, halfHeight - triangleHeight
              ],
              stroke: '#576480',
              strokeWidth: 1,
              dash: [2, 2],
              closed : true
            });
            layer.add(triangleHover);
            // mouseover triangle functionality
            trianglesIndexes.push(triangleHover._id);
            triangleHover.on('mouseover', () => {
              triangles[trianglesIndexes.indexOf(triangleHover._id)].forEach((value) => value.show());
              layer.draw();
              stage.container().style.cursor = 'pointer';
            });
            triangleHover.on('mouseout', () => {
              if (hoverId !== triangleHover._id)
                triangles[trianglesIndexes.indexOf(triangleHover._id)].forEach((value) => value.hide());
              layer.draw();
              stage.container().style.cursor = 'default';
            });
            let triangleClick = () => {
	            hoverId = triangleHover._id;
	            clearAll();
	            triangles[trianglesIndexes.indexOf(triangleHover._id)].forEach((value) => value.show());
	            scope.setVehicle()(value.data);
	            scope.selectedData = angular.copy(value.data);
            };
            triangleHover.on('click', triangleClick);
	          triangleHover.on('touchstart', triangleClick);
            // if triangle already selected
            let data = value.data;
            let vehicle = scope.vehicle;
            if (data.segment_a === vehicle.segment_a && data.segment_b === vehicle.segment_b) {
              hoverId = triangleHover._id;
              clearAll();
              triangles[trianglesIndexes.indexOf(hoverId)].forEach((value) => value.show());
              scope.selectedData = angular.copy(value.data);
            }
          });
    
          // buckets draw
          bucketsData.forEach((value) => {
            if (value.failures) return;
            let segment = segments.filter((item) => value.data.segment_a === item.segment)[0];
            let segmentStartX = segment.startX;
            let segmentEndX = segment.endX;
            let halfOfSegment = Math.floor((segmentEndX - segmentStartX) / 2);
            let halfSegment = segmentStartX + halfOfSegment;
            let oneFourth = Math.floor((segmentEndX - segmentStartX) / 4);
            let oneEight = Math.floor((segmentEndX - segmentStartX) / 8);
            let oneFourthSegment = segmentStartX + oneFourth;
            let halfToSegment = halfSegment + oneFourth;
            // hacks for buckets segments
            if (segment.order_end.length) { halfSegment += oneFourth; halfToSegment += oneEight; }
            if (segment.order_start || isToDepot(segment)) { halfSegment -= oneFourth; oneFourthSegment -= oneEight; }
            // push all shapes to one array
            let bucket = [];
            bucket.push(new Konva.Circle({
              x: (segment.order_end.length) ? halfSegment : segmentStartX,
              y: halfHeight,
              radius: 5,
              fill: 'green',
              strokeWidth: 2
            }));
            bucket.push(new Konva.Circle({
              x: (segment.order_start || isToDepot(segment)) ? halfSegment : segmentEndX,
              y: halfHeight,
              radius: 5,
              fill: 'green',
              strokeWidth: 2
            }));
            bucket.push(new Konva.Line({
              points: [
              	(segment.order_end.length) ? halfSegment : segmentStartX, halfHeight,
	              (segment.order_end.length) ? halfSegment : segmentStartX, halfHeight - bucketHeight,
	              (segment.order_start || isToDepot(segment)) ? halfSegment : segmentEndX, halfHeight - bucketHeight,
	              (segment.order_start || isToDepot(segment)) ? halfSegment : segmentEndX, halfHeight
              ],
              fillLinearGradientStartPoint: { x : segmentStartX, y : halfHeight - bucketHeight},
              fillLinearGradientEndPoint: { x : segmentStartX, y : halfHeight},
              fillLinearGradientColorStops: [0, 'green', 1, 'transparent'],
              stroke: 'green',
              strokeWidth: 1,
              dash: [2, 2],
              closed : true
            }));
            bucket.push(new Konva.Line({
              points: [
              	(segment.order_end.length) ? halfSegment : segmentStartX, halfHeight - bucketHeight,
	              (segment.order_end.length) ? halfSegment : segmentStartX, halfHeight - bucketHeightPre,
	              (segment.order_start || isToDepot(segment)) ? halfSegment : segmentEndX, halfHeight - bucketHeightPre,
	              (segment.order_start || isToDepot(segment)) ? halfSegment : segmentEndX, halfHeight - bucketHeight],
              fill: 'green',
              stroke: 'green',
              strokeWidth: 1,
              dash: [2, 2],
              closed : true
            }));
            bucket.push(new Konva.Text({
              x: ((segment.order_end.length) ? halfToSegment :
	                ((segment.order_start || isToDepot(segment)) ? oneFourthSegment : halfSegment)) - 25,
              y: halfHeight - bucketHeightPre + 5,
              text: 'ADD HERE',
              fontSize: 10,
              fill: 'white'
            }));
            bucket.push(new Konva.Image({
              x: ((segment.order_end.length) ? halfToSegment :
	                ((segment.order_start || isToDepot(segment)) ? oneFourthSegment : halfSegment)) - 6,
              y: halfHeight - bucketHeight,
              image: downExpand,
              width: 10,
              height: 12
            }));
            bucket.forEach((value) => {
              layer.add(value);
              value.hide();
            });
            buckets.push(bucket);
            let bucketHover = new Konva.Line({
              points: [
              	(segment.order_end.length) ? halfSegment : segmentStartX, halfHeight,
	              (segment.order_end.length) ? halfSegment : segmentStartX, halfHeight - bucketHeightPre,
	              (segment.order_start || isToDepot(segment)) ? halfSegment : segmentEndX, halfHeight - bucketHeightPre,
	              (segment.order_start || isToDepot(segment)) ? halfSegment : segmentEndX, halfHeight
              ],
              stroke: '#576480',
              strokeWidth: 1,
              dash: [2, 2],
              closed : true
            });
            layer.add(bucketHover);
	          // mouseover buckets functionality
            bucketIndexes.push(bucketHover._id);
            bucketHover.on('mouseover', () => {
              buckets[bucketIndexes.indexOf(bucketHover._id)].forEach((value) => value.show());
              layer.draw();
              stage.container().style.cursor = 'pointer';
            });
            bucketHover.on('mouseout', () => {
              if (hoverId !== bucketHover._id) buckets[bucketIndexes.indexOf(bucketHover._id)].forEach((value) => value.hide());
              layer.draw();
              stage.container().style.cursor = 'default';
            });
            let bucketClick = () => {
	            hoverId = bucketHover._id;
	            clearAll();
	            buckets[bucketIndexes.indexOf(bucketHover._id)].forEach((value) => value.show());
	            scope.setVehicle()(value.data);
	            scope.selectedData = angular.copy(value.data);
            };
            bucketHover.on('click', bucketClick);
	          bucketHover.on('touchstart', bucketClick);
            // if bucket already selected
            let data = value.data;
            let vehicle = scope.vehicle;
            if (data.segment_a === vehicle.segment_a && vehicle.segment_b === null) {
              hoverId = bucketHover._id;
              clearAll();
              buckets[bucketIndexes.indexOf(hoverId)].forEach((value) => value.show());
              scope.selectedData = angular.copy(value.data);
            }
          });
    
          // draw simple
          if (simple) {
            let segment = _.find(segments, {simple : true});
            let segmentStartX = segment.startX;
            let segmentEndX = segment.endX;
            let halfOfSegment = Math.floor((segmentEndX - segmentStartX) / 2);
            let halfSegment = segmentStartX + halfOfSegment;
            // push shapes to simple array
            bucketSimple.push(new Konva.Circle({
              x: segmentStartX,
              y: halfHeight,
              radius: 5,
              fill: 'green',
              strokeWidth: 2
            }));
            bucketSimple.push(new Konva.Circle({
              x: segmentEndX,
              y: halfHeight,
              radius: 5,
              fill: 'green',
              strokeWidth: 2
            }));
            bucketSimple.push(new Konva.Line({
              points: [
              	segmentStartX, halfHeight,
	              segmentStartX, halfHeight - simpleHeightPre,
	              segmentEndX, halfHeight - simpleHeightPre,
	              segmentEndX, halfHeight
              ],
              fillLinearGradientStartPoint: { x : segmentStartX, y : halfHeight - simpleHeightPre},
              fillLinearGradientEndPoint: { x : segmentStartX, y : halfHeight},
              fillLinearGradientColorStops: [0, 'green', 1, 'transparent'],
              stroke: 'green',
              strokeWidth: 1,
              dash: [2, 2],
              closed : true
            }));
      
            // show previews
            layer.add(new Konva.Line({
              points: [
              	segmentStartX, halfHeight,
	              segmentStartX, halfHeight - simpleHeightPre,
	              segmentEndX, halfHeight - simpleHeightPre,
	              segmentEndX, halfHeight
              ],
              fillLinearGradientStartPoint: { x : segmentStartX, y : halfHeight - simpleHeightPre},
              fillLinearGradientEndPoint: { x : segmentStartX, y : halfHeight},
              fillLinearGradientColorStops: [0, '#576480', 1, 'transparent'],
              stroke: 'transparent',
              strokeWidth: 0,
              closed : true,
              opacity: 0.3
            }));
      
            bucketSimple.push(new Konva.Text({
              x: halfSegment - 25,
              y: halfHeight - simpleHeightPre + 5,
              text: 'ADD HERE',
              fontSize: 10,
              fill: 'white'
            }));
            bucketSimple.push(new Konva.Image({
              x: halfSegment - 6,
              y: halfHeight - simpleHeight,
              image: downExpand,
              width: 10,
              height: 12
            }));
            bucketSimple.forEach((value) => {
              layer.add(value);
              value.hide();
            });
      
            let lastSimple = new Konva.Line({
              points: [
              	segmentStartX, halfHeight,
	              segmentStartX, halfHeight - simpleHeightPre,
	              segmentEndX, halfHeight - simpleHeightPre,
	              segmentEndX, halfHeight
              ],
              stroke: "#576480",
              strokeWidth: 1,
              dash: [2, 2],
              closed : true
            });
            layer.add(lastSimple);
	          // mouseover simple segment functionality
            lastSimple.on('mouseover', () => {
              bucketSimple.forEach((value) => {
                value.show();
              });
              layer.draw();
              stage.container().style.cursor = 'pointer';
            });
            lastSimple.on('mouseout', () => {
              if (hoverId !== lastSimple._id)
                bucketSimple.forEach((value) => value.hide());
              layer.draw();
              stage.container().style.cursor = 'default';
            });
            let lastSimpleClick = () => {
	            hoverId = lastSimple._id;
	            clearAll();
	            bucketSimple.forEach((value) => value.show());
	            scope.setVehicle()(simple.data);
	            scope.selectedData = angular.copy(simple.data);
            };
            lastSimple.on('click', lastSimpleClick);
	          lastSimple.on('touchstart', lastSimpleClick);
            // if simple already selected
            let vehicle = scope.vehicle;
            if (vehicle.segment_a === null && vehicle.segment_b === null) {
              hoverId = lastSimple._id;
              clearAll();
              bucketSimple.forEach((value) => {
                value.show();
              });
              scope.selectedData = angular.copy(simple.data);
            }
          }
	
	        for (let i = 0; i < segments.length; i++) {
		        let segment = segments[i];
		
		        // calculations for each segment
		
		        segment.startX = i * step;
		        segment.endX = (i + 1) * step;
		
		        // for timeline
		
		        if (segment.duration) {
			        totalDuration += segment.duration;
		        }
		
		        let segmentStartX = segment.startX;
		        let segmentEndX = segment.endX;
		        let halfOfSegment = Math.floor((segmentEndX - segmentStartX) / 2);
		        let halfSegment = segmentStartX + halfOfSegment;
		        // draw to Depot marker
		        if (isToDepot(segment)) {
			        // drawing circle end or start
			        let toDepotMarker = (isHomeThisSegment) ? new Konva.Circle({
				        x: halfSegment,
				        y: halfHeight,
				        radius: 15,
				        fill: 'black',
				        stroke: 'green',
				        strokeWidth: 6
			        }) : new Konva.Image({
				        x: halfSegment-17,
				        y: halfHeight-17,
				        image: toDepot,
				        width: 34,
				        height: 34
			        });
			
			        // for showing tooltip
			        segment.toDepotMarkerId = toDepotMarker._id;
			        toDepotMarker.on("mousemove", () => {
				        let mousePos = stage.getPointerPosition();
				        mousePos.x = mousePos.x * ((scope.isSmallDimension()) ? 1.42857142857 : 1);
				        let mousePosX = mousePos.x < 160 ? 10 : ((mousePos.x > width - 160) ? width - 310 : (mousePos.x - 150));
				        tooltip.position({
					        x : mousePosX,
					        y : mousePos.y + (scope.isSmallDimension() ? 55 : 25)
				        });
				        rect.position({
					        x : mousePosX,
					        y : mousePos.y + (scope.isSmallDimension() ? 55 : 25)
				        });
				        let currentSegment = _.find(segments, {toDepotMarkerId: toDepotMarker._id});
				        let currentData = currentSegment.order_end_data;
				        let tooltipText = 'Address: '  + currentData.address + "\n";
				        tooltipText += 'Scheduled Time: ' + Utils.toStringDateTime(new Date(currentData.time), "MM/DD/YYYY h:mm A");
				        let resultTooltip = Utils.stripByLineBreak(tooltipText, 40);
				        let lines = resultTooltip.split('\n').length - 4;
				        tooltip.fontSize(13-lines);
				        tooltip.text(resultTooltip);
				        tooltip.show();
				        rect.fill('green');
				        rect.show();
				        layer.draw();
				        stage.container().style.cursor = 'pointer';
			        });
			        toDepotMarker.on("mouseout", () => {
				        tooltip.hide();
				        rect.hide();
				        layer.draw();
				        stage.container().style.cursor = 'default';
			        });
			        if (!isHomeThisSegment) {
				        layer.add(new Konva.Circle({
					        x: halfSegment,
					        y: halfHeight,
					        radius: 17,
					        fill: 'black'
				        }));
				        layer.add(toDepotMarker);
			        } else {
				        layer.add(toDepotMarker);
				        let homeIcon = new Konva.Image({
					        x: halfSegment-10,
					        y: halfHeight-10,
					        image: geoDepot,
					        width: 20,
					        height: 20
				        });
				        segment.toHomeId = homeIcon._id;
				        homeIcon.on("mousemove", () => {
					        let mousePos = stage.getPointerPosition();
					        mousePos.x = mousePos.x * ((scope.isSmallDimension()) ? 1.42857142857 : 1);
					        let mousePosX = mousePos.x < 160 ? 10 : ((mousePos.x > width - 160) ? width - 310 : (mousePos.x - 150));
					        tooltip.position({
						        x : mousePosX,
						        y : mousePos.y + (scope.isSmallDimension() ? 55 : 25)
					        });
					        rect.position({
						        x : mousePosX,
						        y : mousePos.y + (scope.isSmallDimension() ? 55 : 25)
					        });
					        let currentSegment = _.find(segments, {toHomeId: homeIcon._id});
					        let currentData = currentSegment.order_end_data;
					        let tooltipText = 'Address: '  + currentData.address + "\n";
					        tooltipText += 'Scheduled Time: ' + Utils.toStringDateTime(new Date(currentData.time), "MM/DD/YYYY h:mm A");
					        let resultTooltip = Utils.stripByLineBreak(tooltipText, 40);
					        let lines = resultTooltip.split('\n').length - 4;
					        tooltip.fontSize(13-lines);
					        tooltip.text(resultTooltip);
					        tooltip.show();
					        rect.fill('green');
					        rect.show();
					        layer.draw();
					        stage.container().style.cursor = 'pointer';
				        });
				        homeIcon.on("mouseover", () => {
					        tooltip.show();
					        rect.show();
					        layer.draw();
					        stage.container().style.cursor = 'pointer';
				        });
				        layer.add(homeIcon);
			        }
		        }
		
		        if (isStartPointInitialized(segment)) {
			        // for showing tooltip
			        layer.add(new Konva.Circle({
				        x: halfSegment,
				        y: halfHeight,
				        radius: 5,
				        fill: 'green',
				        strokeWidth: 2
			        }));
		        }
	        }
  
          // add tooltip to layer
          layer.add(rect);
  
          layer.add(tooltip);
    
          // small dimension screen changes
          if (scope.isSmallDimension()) stage.scale({x: 0.7, y: 0.7});
          
          stage.add(layer);
        };
        imageObj.src = '/images/car_top_view.png';
        downExpand.src = '/images/ic_expand_more_black2_18px.png';
        geoEnd.src = '/images/geo_blue.png';
	      geoDepot.src = '/images/geo_depot.png';
        toDepot.src = '/images/depot_route_active.png';
      };
      
      let _timeout = null;

      let timeoutDrawAll = (anyway) => {
        if (_timeout !== null) $timeout.cancel();
        _timeout = $timeout(() => drawAll(anyway));
      };
      
      scope.$watch('segments', () => timeoutDrawAll(), true);
      scope.$watch('vehicle', () => timeoutDrawAll(), true);
      
      window.addEventListener('resize', () => timeoutDrawAll(true));
    }
  };
});