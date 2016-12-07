$(document).ready(function() {
  $('#watchFine').click(function(){
    $.get('/services/getAverageFine',function(data){
      alert("Average Fine Paid By User is : $"+ parseFloat(data[0].fine).toFixed(2));
    });
  });
});
