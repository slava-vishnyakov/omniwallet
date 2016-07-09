angular.module("omniFactories")
	.factory("DExOffer",["Address", "WHOLE_UNIT",function DExOfferFactory(Address, WHOLE_UNIT){
		var DExOffer= function(data,propertydesired,propertyselling,side){
			var self = this;

			self.initialize = function(){
				data = data || {};

				self.rawdata = data;
				self.propertyselling = propertyselling;
				self.propertydesired = propertydesired;
				self.available_amount = propertyselling.divisible ? new Big(data.available_amount).times(WHOLE_UNIT) : new Big(data.available_amount);
				self.selling_amount = propertyselling.divisible ? new Big(data.total_amount).times(WHOLE_UNIT) : new Big(data.total_amount);
				self.desired_amount = propertydesired.divisible ? new Big(data.desired_amount).times(WHOLE_UNIT) : new Big(data.desired_amount);
				if(side == "ask"){
					
				} else {
					self.price = self.selling_amount.div(self.desired_amount);
				}


			};


			self.initialize();
		}

		return DExOffer;
	}]);