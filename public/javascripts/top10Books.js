
$(document).ready(function() {
  // alert($('#dataOfBooks').html());
  var table = $('#top10BooksTable').DataTable({
        data: JSON.parse($('#top10Books').html()).slice(0,10),
        'bSort': true,
        "pageLength": 15,
        columns: [
          { data: 'lbid', title:'Reader Id'},
          { data: 'numberoftimes', title:'Number of Times'},
          { data: 'title', title:'Title of Books'},
          { data: 'name', title:'Branch'},
        ],
        columnDefs: [
          { "width": "10%", "targets": 0 },
          { "width": "20%", "targets": 1 },
          { "width": "35%", "targets": 2 },
          { "width": "35%", "targets": 3 },
        ],

        "scrollY":        $(document).height()-250 +"px",
        // "scrollCollapse": true,
        "info":           true,
        "paging":         false,
        rowReorder: {
            selector: 'td:nth-child(2)'
        },
        responsive: true,
        "fnDrawCallback": function ( oSettings ) {
            /* Need to redo the counters if filtered or sorted */
            if ( oSettings.bSorted || oSettings.bFiltered )
            {
                for ( var i=0, iLen=oSettings.aiDisplay.length ; i<iLen ; i++ )
                {
                    $('td:eq(0)', oSettings.aoData[ oSettings.aiDisplay[i] ].nTr ).html( i+1 );
                }
            }
        },
        // "aoColumnDefs": [
        //     { "bSortable": false, "aTargets": [ 0 ] }
        // ],
        "aaSorting": [[ 2, 'asc' ]]
  });

  // $('.book-datatable-actions').click(function(){
  //   var child = $(this).parent().parent().children()[0];
  //   var rowId = child._DT_CellIndex.row;
  //   var data = JSON.parse($('#dataOfBooks').html());
  //   if(confirm("Press Ok to confirm reservation for following book. \n\nBook name:"+data[rowId].title+"\nBranch: "+data[rowId].branchname+"\nISBN: "+data[rowId].isbn))
  //   {
  //     $.ajax({
  //           url: "/checkoutBook",
  //           type: 'PUT',
  //           data: data[rowId],
  //           dataType: 'json',
  //           success: function(result) {
  //             if(result.error)
  //             {
  //               alert(result.error);
  //             } else if(result.success){
  //               alert(result.success);
  //               location.reload();
  //             } else {
  //               alert(JSON.stringify(result));
  //             }
  //           }
  //       });
  //   }
  //   // alert(JSON.stringify(data[rowId]))
  // });

});
