/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////
// Exam: Mercado Pago inStore "QR Vendedor modelo Atendido" 
// June 5th, 2020
// por Daniel Atik
// daniel.atik@mercadopago.com
/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////

// INSTRUCCIONES
// -------------
// Revisa los comentarios de este código y haz 
// los cambios necesarios para que funcione 
// correctamente todo el flujo.
// Busca los comentarios que dicen: REVISA AQUÍ:



$(document).ready(function() {
	
	// Define 10 minutos de timeout de una orden
	var orderTimeout = 60 * 10;

	// Muestra el listado de productos según el campo items definido al final.
	showProductList();

	// Rellena el selector de país. Si te diese algún error de javascript prueba
	// borrando la caché del navegador.
	fillCountrySelector();

	// Abre modal al pulsar sobre el botón de pagar con Mercado Pago.

	$('#exampleModal').on('show.bs.modal', function (event) {
	  var button = $(event.relatedTarget); // Botón que gatilla la apertura modal
	  var buttonOption = button.data('option'); 
	  var modal = $(this);
	  var checkStatus;

	  switch(buttonOption) {

		  case "Cash": // Opción de pago con efectivo. Pero antes de usarlo piensa detenidamente...
		    
		    playSound("cash");
		    modal.find(".modal-body").text("Are you sure you wanna pay with cash?");
		    modal.find(".btn-primary").text("¡NO! 🤣");
		    modal.find(".btn-primary").on("click",function(){$('#exampleModal').modal("hide");});
		    break;


		  case "Mercado Pago": // Método de pago de Mercado Pago
		  	
		  	var store_id = $('#store_id').val(); // Obtención de store_id de la página
		  	var external_id = $('#external_id').val();// obtención de external id del POS de la página
		  	var external_store_id = $('#externalStoreID').val();// obtención de external id del POS de la página
		  	
		  	var external_reference = $('#external_reference').val(); // obtención del external_id de la página
		  	modal.find(".modal-body").html("<center><div id='qr'></div><div id='countDown'></div><br/><div id='loading'></div><br/><div id='orderStatus'></div><div id='orderResponse'></div></center>");
		    modal.find(".btn-primary").text("Cancel");
		    

		    // Muestra el código QR del punto de venta seleccionado

		    // Llama al servicio de obtención de información de un POS/QR en base al external_pos_id o también llamado external_id
			$.get("api/pos/get/",{"external_id":external_id},function(data){
				console.log("Obtención información de QR:");
				console.log(data);

				// Si existe external_ID...

				if(data.paging.total>0){
			
					// Muestra el código QR en pantalla:

					$('#qr').html("<img with='350px' height='350px' src='"+data.results[0].qr.image+"'>");
					
					// REVISA AQUÍ:
					// Agrega la URL notification_url y modifica los campos que creas necesarios 
					// para recibir las notificaciones en tu endpoint público.

					var orderJSON ={"external_reference": external_reference,
									"notification_url": "",
									"total_amount":XXX,
									"title":"Compra en ACME SA",
									"description":"Productos",
									"items" : items
									};

					// Crea orden en base al external_id de la página

					$.post("api/order/create/",{"external_id":external_id,"external_store_id":external_store_id,"json":JSON.stringify(orderJSON)},function(data){

						console.log("Crea orden:");
						console.log(data);

						// Muestra JSON de la orden creada
						$('#createdOrder').text(JSON.stringify(data));

						// Inicia cuenta a trás de 10 minutos
						display = $('#countDown');
    					startTimer(orderTimeout, display);

    					// Cash sound?
    					var cashSound=true;

						// Inicia comprobación de estado de pago cada 3 segundos

						checkStatus = setInterval(function(){

							// Comprueba estado del pago vía Seach de Merchant_order

							$.get("api/order/status/",{"external_reference":external_reference},function(data){
								
								console.log("Search de Merchant_order:");
								console.log(data);

								var elements = data.elements;
								var totalElements = data.total;
								
								if(totalElements>0){ 

									var orderStatus = elements[totalElements-1].status;
									$('#orderStatus').text(orderStatus);
									$('#loading').html("<img src='assets/img/ajax-loader.gif'>");

									try{
										if(orderStatus=="opened" && elements[totalElements-1].payments[0].status=="rejected"){
											// print 
											if($('#paymentStatusRejected').text()==""){
												$('#paymentStatusRejected').text(JSON.stringify(data));
											}
										}
									}catch(e){}

									// Si la orden se cerró (pagó) termina el timeout y pinta el JSON resultante y cierra el modal

									if(orderStatus=="closed"){
										if(cashSound){playSound("cash")};
										cashSound=false;
										setTimeout(clearInterval(checkStatus),3000);

										$('#orderFinalStatus').text(elements[totalElements-1]);
										$('#exampleModal').modal("hide");
										$('#paymentStatusSearch').text(JSON.stringify(data));

										
									} // Fin if
								}// Fin totalElements
							});

							
							// Comprueba el estado del pago de la orden en servicio de recepción de notificaciones

							$.get("api/notifications/get/",{},function(data){
								console.log("Search Notifications:");
								console.log(data);

								if(data.status=="opened" && data.external_reference==external_reference){
						 			
							 		$('#orderStatus').text(data.status);
							 		$('#loading').html("<img src='assets/img/ajax-loader.gif'>");
								}

								try{
									if(orderStatus=="opened" && elements[totalElements-1].payments[0].status=="rejected"){
										// print 
										if($('#paymentStatusRejected').text()==""){
											$('#paymentStatusRejected').text(JSON.stringify(data));
										}
									}
								}catch(e){}

								// Si la orden se cerró (pagó) se termina la búsqueda y cierra modal.
								
								if(data.status=="closed" && data.external_reference==external_reference){
									if(cashSound){playSound("cash")};
									cashSound=false;
									setTimeout(clearInterval(checkStatus),3000);
									$('#exampleModal').modal("hide");
									$('#paymentStatusNotification').text(JSON.stringify(data));

								}
							});


							
						}, 3000); // finaliza intervalo

					}); // end get pos information
				
				}else{ // end if total

					$('#qr').html("This External POS ID: 'EPOSID' does not exists<br/>for this Store ID: 'Store_id'".replace("EPOSID",external_id).replace("Store_id",store_id));

				} 

			});


		    


		    // Si el cajero cancela la orden

		    modal.find(".btn-primary").on("click",function(){ // Cancela la orden

		    	// Clear check status interval
		    	clearInterval(checkStatus);

				$.get("api/order/delete/",{"external_id":external_id},function(){
					
				});

		    	$('#exampleModal').modal("hide");
		    });

		    break;
		} // end switch




	  modal.find('.modal-title').text('Pay with '+buttonOption);
	  
	});






///////////////////////////////////////////////////////////////////////////
// Common Functions
///////////////////////////////////////////////////////////////////////////

	function playSound(soundObj) {
		var sound = document.getElementById(soundObj);
		sound.play();
    }; // end playsound


    // Pinta los productos en el checkout.

	function showProductList(){
		var total = 0;
		for (i in items){
			$('#productList').append("<tr><th scope='row'>"+items[i].id+"</th><td><img with='60px' height='60px' src='"+items[i].picture_url+"'></td><td>"+items[i].title+"</td><td>"+items[i].quantity+"</td><td>"+items[i].unit_price+"</td><td>"+items[i].quantity*items[i].unit_price+"</td></tr>");
			total = total + items[i].quantity*items[i].unit_price;
		}
		$('#productList').append("<tr><th scope='row'></th><td></td><td></td><td></td><td><b>Total:</b></td><td><b>"+total+"</b></td></tr>")
	}; // end showProductList

	// Muestra cuenta atrás.

	function startTimer(duration, display) {
	    var timer = duration, minutes, seconds;
	    setInterval(function () {
	        minutes = parseInt(timer / 60, 10)
	        seconds = parseInt(timer % 60, 10);

	        minutes = minutes < 10 ? "0" + minutes : minutes;
	        seconds = seconds < 10 ? "0" + seconds : seconds;

	        display.text(minutes + ":" + seconds);

	        if (--timer < 0) {
	            timer = duration;
	        }
    	}, 1000);
	};// end starttimer 

   

///////////////////////////////////////////////////////////////////////////
// Estas funciones muestran los selectores de país, región, comuna, barrio, ciudad
///////////////////////////////////////////////////////////////////////////
	function fillCountrySelector(){

		$.get("https://api.mercadolibre.com/countries",function(countries){
			$('#country').html("<option>Selecciona el país...</option>");

			for(country in countries){
				$('#country').append("<option value='"+countries[country].id+"'>"+countries[country].name+"</option>");
			}
		});

	}; // 

	$("#country").change(function(){
		var selectedCountry = $("#country option:selected").val();
		$.get("https://api.mercadolibre.com/countries/"+selectedCountry,function(regions){
			regions = regions.states;
			$('#states').html("<option>Selecciona la región...</option>");

			for(region in regions){
				$('#states').append("<option value='"+regions[region].id+"'>"+regions[region].name+"</option>");
			}
		});
	});

	$("#states").change(function(){
		var selectedState = $("#states option:selected").val();

		$.get("https://api.mercadolibre.com/states/"+selectedState,{},function(cities){
			cities = cities.cities;
			$('#cities').html("<option>Selecciona la ciudad o comuna...</option>");

			for(city in cities){
				$('#cities').append("<option value='"+cities[city].id+"'>"+cities[city].name+"</option>");
			}
		});
	});
///////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////
// Función de sucursal o Store
///////////////////////////////////////////////////////////////////////////

	$('#createStore').click(function(){
		var storeName=$('#storeName').val();
		var streetName=$('#streetName').val();
		var streetNumber=$('#streetNumber').val();
		var country=$('#country option:selected').text();
		var state=$('#states option:selected').text();
		var city=$('#cities option:selected').text();
		var latitude = $('#latitude').val();
		var longitude = $('#longitude').val();
		var addressReference = $('#addressReference').val();
		var externalStoreID = $('#externalStoreID').val();


		// REVISA AQUÍ:
		// Modifica el storeJSON con la estructura necesaria para crear una Store correctamente.

		var storeJSON = {}

		console.log(storeJSON);
		$.post("api/store/create/",{json:JSON.stringify(storeJSON)},function(results){
			console.log("Crea store:");
			console.log(results);
			$("#responseStore").text(JSON.stringify(results));
		});
	});

///////////////////////////////////////////////////////////////////////////
// POS Functions
///////////////////////////////////////////////////////////////////////////

	$('#createPOS').click(function(){

		var posName=$('#storeName').val();
		var externalStoreID=$('#externalStoreIDPOS').val();
		var externalPOSID=$('#externalPOSID').val();

		// REVISA AQUÍ:

		var category = 1;   // Agrega aquí el número de categoría o MCC necesario para 
							// Identificar al POS de restaurante


		// REVISA AQUÍ:
		// Comprueba que el posJSON sea el adecuado para crear un POS integrado correctamente.

		var posJSON ={"name":posName,
					"external_store_id":externalStoreID,
					"fixed_amount":false,
					"category_id":category,
					"external_id":externalPOSID};



		$.post("api/pos/create/",{json:JSON.stringify(posJSON)},function(results){
			console.log("Crea POS/QR:");
			console.log(results);

			$("#responsePOS").text(JSON.stringify(results));

		});
	});


}); // Fin document ready


// REVISA AQUÍ:
// La suma total de producto debería sumar $660
// Haz los cambios necesarios en las cantidades y/o precio unitario para lograrlo

var items = [{
			"sku_number":"sku021",
		    "title" : "Caffè Americano",
		    "description" : "Espresso shots topped with hot water create a light layer of crema culminating in this wonderfully rich cup with depth and nuance. Pro Tip: For an additional boost, ask your barista to try this with an extra shot.",
		    "unit_price" : 90,
		    "unit_measure": "unit",
		    "quantity" : 1,
		    "total_amount": 90
		  },
		  {
		  	"sku_number":"sku011",
		    "title" : "Caffè Misto",
		    "description" : "A one-to-one combination of fresh-brewed coffee and steamed milk add up to one distinctly delicious coffee drink remarkably mixed.",
		    "unit_price" : 105,
		    "unit_measure": "unit",
		    "quantity" : 1,
		    "total_amount": 105
		  },
		  {
		  	"sku_number":"sku097",
		    "title" : "Iced Lemon Loaf Cake",
		    "description" : "This citrusy, buttery, moist lemon pound cake topped with a sweet icing creates an amazingly refreshing cake like never before.",
		    "unit_price" : 125,
		    "unit_measure": "unit",
		    "quantity" : 3,
		    "total_amount": 375
		  }];



