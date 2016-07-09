angular.module("omniFactories")
	.factory("Orderbook",["$http","DExOrder","DExOffer","Transaction","Account","Wallet","ModalManager","MIN_MINER_FEE", "WHOLE_UNIT", "SATOSHI_UNIT", 
		function OrderbookFactory($http,DExOrder,DExOffer,Transaction,Account,Wallet,ModalManager,MIN_MINER_FEE,WHOLE_UNIT,SATOSHI_UNIT){
			var Orderbook = function(tradingPair){
				var self = this;

				self.initialize = function(){
					self.tradingPair=tradingPair;
					self.title = "Trade " + tradingPair.selling.name + " for " + tradingPair.desired.name;
					self.active = true;
					self.disabled = !self.active;
					self.buyOrder = {
						desired : tradingPair.selling,
						selling : tradingPair.desired,
						amounts : {
							desired: 0,
							selling: 0
						},
						price: 0
					};
					self.sellOrder = {
						desired : tradingPair.desired,
						selling : tradingPair.selling,
						amounts : {
							desired: 0,
							selling: 0
						},
						price: 0
					};

					self.selling = tradingPair.selling;
					self.desired = tradingPair.desired;

					// TODO:  list only addresses with balance > 0
					self.addresses = Wallet.addresses.filter(function(address){
						return ((address.privkey && address.privkey.length == 58) || address.pubkey)
					});
					self.buyAddresses = self.addresses.filter(function(address){
						return address.getBalance(self.desired.propertyid) > 0;
					});
					self.buyOrder.address = self.buyAddresses.length > 0 ? self.buyAddresses[0] : undefined;
					self.sellAddresses = self.addresses.filter(function(address){
						return address.getBalance(self.selling.propertyid) > 0;
					});
					self.sellOrder.address = self.sellAddresses.length > 0 ? self.sellAddresses[0] : undefined;

					self.askBook = [];
					self.bidBook = [];
					self.activeOffers = [];

					// I get the orders for property selling asks
					$http.get("/v1/omnidex/"+tradingPair.desired.propertyid+"/"+tradingPair.selling.propertyid)
						.then(function(response){
							if(response.status != 200 || response.data.status !=200)
								return // handle errors

							self.parseOrderbook(response.data.orderbook, self.askBook,tradingPair.desired,tradingPair.selling);

							self.askBook.sort(function(a, b) {
					          var priceA = a.price;
					          var priceB = b.price;
					          return priceA.gt(priceB) ? -1 : priceA.lt(priceB) ? 1 : 0;
					        });
						})
					$http.get("/v1/omnidex/"+tradingPair.selling.propertyid+"/"+tradingPair.desired.propertyid)
						.then(function(response){
							if(response.status != 200 || response.data.status != 200)
								return // handle errors
							
							self.parseOrderbook(response.data.orderbook, self.bidBook,tradingPair.selling,tradingPair.desired);

							self.bidBook.sort(function(a, b) {
					          var priceA = a.price;
					          var priceB = b.price;
					          return priceA.lt(priceB) ? -1 : priceA.gt(priceB) ? 1 : 0;
					        });
						})

				};

				self.parseOrderbook =function(orderbook,side,selling,desired){
					orderbook.forEach(function(offerData){
						var order = null;
						var offer = new DExOffer(offerData,selling,desired);
						side.forEach(function(orderData){
							if(orderData.price.eq(offer.price)){
								order = orderData;
								order.addOffer(offer)
							}
						})
						let owner = Wallet.tradableAddresses().find(function(elem){
							return elem.hash == offerData.seller
						})
						if(owner){
							offer.ownerAddress = owner;
							offer.side = selling == self.tradingPair.selling ? "ask":"bid";
							self.activeOffers.push(offer);
						}
						if(order == null){
							order = new DExOrder(offer);
							side.push(order);
						}


					});
				}

			self.askCumulative = function(order){
				let index = self.askBook.indexOf(order);
				let cumulative = new Big(0);
				for (let i = 0; i <= index; i++){
					cumulative = cumulative.plus(self.askBook[i].remainingforsale)
				}
				return cumulative;
			}
			self.bidCumulative = function(order){
				let index = self.bidBook.indexOf(order);
				let cumulative = new Big(0);
				for (let i = 0; i <= index; i++){
					cumulative = cumulative.plus(self.bidBook[i].remainingforsale)
				}
				return cumulative;
			}

				self.setBuyAddress = function(address){
					self.buyOrder.address = address;
				};

				self.setSellAddress = function(address){
					self.sellOrder.address = address;
				};

				self.updateAmount = function(offer) {
					offer.amounts.selling= (offer.amounts.desired * offer.price) ||0;
				}

				self.submitOffer = function(offer){
					// TODO: Validations
					var fee = Account.settings.minerFee || MIN_MINER_FEE;
					var dexOffer = new Transaction(25,offer.address,fee,{
							transaction_version:0,
							propertyidforsale:offer.selling.propertyid,
							amountforsale: new Big(offer.amounts.selling).valueOf(),
							propertiddesired:offer.desired.propertyid,
							amountdesired: new Big(offer.amounts.desired).valueOf()
						});
					ModalManager.openConfirmationModal({
						dataTemplate: '/views/modals/partials/dex_offer.html',
						scope: {
							title:"Confirm DEx Transaction",
							address:offer.address,
							saleCurrency:offer.selling.propertyid,
							saleAmount:offer.amounts.selling,
							desiredCurrency:offer.desired.propertyid,
							desiredAmount:offer.amounts.desired,
							totalCost:dexOffer.totalCost,
							action:"Add",
							confirmText: "Create Transaction",
							successMessage: "Your order was placed successfully"
						},
						transaction:dexOffer
					});
				};

				self.getBalance = function(address, assetId){
					return address && address.getBalance(assetId) ? new Big(address.getBalance(assetId)).times(WHOLE_UNIT).valueOf() : 0;
				}

				self.initialize();
			}

			return Orderbook;
		}]);