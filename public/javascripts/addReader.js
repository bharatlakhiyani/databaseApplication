//var num = Math.floor(Math.random() * 90000) + 10000;
$(document).ready(function() {
  // alert($('#dataOfBooks').html());
  // validity=true;
  // while(validity){
  //   alert(1);
    var cardNumber=Math.floor(Math.random() * 120000000000) + 999999999999;
    // $.get('/services/checkCardExistence?cardNumber='+cardNumber,function(data){
    //   if(data.exists==false)
    //   {
    //     validity=data.exists;
        $('#cNumber').val(cardNumber.toString().substr(0,12));
  //     }
  //   });
  // }
});
