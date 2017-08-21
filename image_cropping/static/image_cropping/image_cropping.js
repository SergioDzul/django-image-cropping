var current = '';
var iWidth=800, iHeight=500;
var image_cropping = (function ($) {
  var jcrop = {};
  function init() {
    var self = this;
    // debugger;
    $('input.image-ratio').each(function(index) {
      var $this = $(this);

      // find the image field corresponding to this cropping value
      // by stripping the last part of our id and appending the image field name
      var field = $this.attr('name').replace($this.data('my-name'), $this.data('image-field'));
      // there should only be one file field we're referencing but in special cases
      // there can be several. Deal with it gracefully.
      var $image_input = $('input.vFileBrowseField[name=' + field + ']:first');

      $image_input = $($image_input[0]);
      current = $image_input.val();


      $('.fb_show').click(function(){
        $image_input.focus();

        var value = $image_input.val();
        var x = jQuery('img[src="/media/'+value+'"]');

        if(x.length){
          x.each(function(){
            this.remove();
          });
          jQuery('.jcrop-holder.jcrop-image').remove();
        }
      });

      $image_input.off('blur').on('blur', function(){
        var value = $image_input.val();
        if(current != value){
          current = value;
          image_cropping.init();
        }
      });

      // skip this image if it's empty and hide the whole field, within admin and by itself
      /*
       if (!$image_input.length) {
       $this.hide().parents('div.form-row:first').hide();
       return;
       }*/

      // check if the image field should be hidden
      /*
       if ($image_input.data('hide-field')) {
       $image_input.hide().parents('div.form-row:first').hide();
       }
       */
      var cropping_process = function(){

        var image_id = $this.attr('id') + '-image';
        var org_width = iWidth; // wee need the real width of the picture
        var org_height = iHeight;
        var min_width = $this.data('min-width'), // min is the value defined in model with size
          min_height = $this.data('min-height');

        var is_image_portrait = (org_height > org_width);
        var is_select_portrait = (min_height > min_width);

        if ($this.data('adapt-rotation') === true) {
          if (is_image_portrait != is_select_portrait) {
            // cropping height/width need to be switched, picture is in portrait mode
            var x = min_width;
            min_width = min_height;
            min_height = x;
          }
        }

        var $image = $('<img>', {
          'id': image_id,
          'src': '/media/'+$image_input.val()
        });

        $image = $image[0];


        var options = {
          minSize: [5, 5],
          keySupport: false,
          // allowResize: false,
          allowSelect: false,
          trueSize: [org_width, org_height],
          onSelect: update_selection($this),
          addClass: ($this.data('size-warning') && ((org_width < min_width) || (org_height < min_height))) ? 'size-warning jcrop-image': 'jcrop-image'
        };
        if ($this.data('ratio')) {
          options['aspectRatio'] = $this.data('ratio')-0.2;
        }
        if ($this.data('box_max_width')) {
          options['boxWidth'] = $this.data('box_max_width');
        }
        if ($this.data('box_max_height')) {
          options['boxHeight'] = $this.data('box_max_height');
        }



        var cropping_disabled = false;
        if($this.val()[0] == "-"){
          cropping_disabled = true;
          $this.val($this.val().substr(1));
        }

        // is the image bigger than the minimal cropping values?
        // otherwise lock cropping area on full image
        var initial;

        if ($this.val()) {
          $this.hide();
          initial = initial_cropping($this.val());
        } else {

          initial = max_cropping(min_width, min_height, org_width, org_height);

          // set cropfield to initial value
          $this.val(initial.join(','));
        }

        $.extend(options, {setSelect: initial});

        // hide the input field, show image to crop instead
        // $this.hide().after($image);
        // debugger;
        // var par = $this.parrent()

        if(!$('#'+image_id).length && $image_input.val() !== '') {
          $this.parent().append($image);
          $('#' + image_id).Jcrop(options, function(){jcrop[image_id]=this;});
        }


        if ($this.data('allow-fullsize') === true) {
          if(cropping_disabled){
            jcrop[image_id].release();
            $this.val('-'+$this.val());
          }
          var label = 'allow-fullsize-'+image_id;
          var checked = cropping_disabled ? '' : ' checked="checked"';
          var fullsize = $('<div class="field-box allow-fullsize">' +
            '<input type="checkbox" id="'+label+'" name="'+label+'"'+checked+'></div>');

          if ($this.parent().find('.help').length) {
            fullsize.insertBefore($this.parent().find('.help'));
          } else {
            fullsize.appendTo($this.parent());
          }

          $('#'+label).click(function(){
            if (cropping_disabled === true){
              $this.val($this.val().substr(1));
              jcrop[image_id].setSelect($this.val().split(','));
              cropping_disabled = false;
            } else {
              $this.val('-'+$this.val());
              jcrop[image_id].release();
              cropping_disabled = true;
            }
          });

          $this.parent().find('.jcrop-tracker').mousedown(function(){
            if (cropping_disabled){
              $('#'+label).attr('checked','checked');
              cropping_disabled = false;
            }
          });
        }
      };

      var img = new Image();
      img.onload = function() {
        // debugger;
        iWidth = this.width;
        iHeight = this.height;
        cropping_process();
      }
      img.src = '/media/'+$image_input.val();
    });

  }

  function max_cropping (width, height, image_width, image_height) {
    var ratio = width/height;
    var offset;

    if (image_width < image_height * ratio) {
      // width fits fully, height needs to be cropped
      offset = Math.round((image_height-(image_width/ratio))/2);
      return [0, offset, image_width, image_height - offset];
    }
    // height fits fully, width needs to be cropped
    offset = Math.round((image_width-(image_height * ratio))/2);
    return [offset, 0, image_width - offset, image_height];
  }

  function initial_cropping (val) {
    if (val === '') { return; }
    var s = val.split(',');
    return [
      parseInt(s[0], 10),
      parseInt(s[1], 10),
      parseInt(s[2], 10),
      parseInt(s[3], 10)
    ];
  }

  function _update_selection (sel, $crop_field) {
    if ($crop_field.data('size-warning')) {
      crop_indication(sel, $crop_field);
    }
    $crop_field.val(new Array(
      Math.round(sel.x),
      Math.round(sel.y),
      Math.round(sel.x2),
      Math.round(sel.y2)
    ).join(','));
  }

  function update_selection ($crop_field) {
    return function(sel) { _update_selection(sel, $crop_field); };
  }

  function crop_indication (sel, $crop_field) {
    // indicate if cropped area gets smaller than the specified minimal cropping
    var $jcrop_holder = $crop_field.siblings('.jcrop-holder');
    var min_width = $crop_field.data("min-width");
    var min_height = $crop_field.data("min-height");
    if ((sel.w < min_width) || (sel.h < min_height)) {
      $jcrop_holder.addClass('size-warning');
    } else {
      $jcrop_holder.removeClass('size-warning');
    }
  }

  return {
    init: init,
    jcrop: jcrop
  };

})(jQuery);

jQuery(function() {
  var image_cropping_jquery_url = jQuery('.image-ratio:first').data('jquery-url');
  if (image_cropping_jquery_url == "None") {
    // JQUERY_URL is set to `none`. We therefore use the existing version of
    // jQuery and leave it otherwise untouched.
    jQ = jQuery;
  } else {
    // JQUERY_URL is specified. Image Cropping's jQuery is included in no conflict mode,
    jQ = jQuery.noConflict(true);
  }
  jQ(function() {image_cropping.init();});
});
