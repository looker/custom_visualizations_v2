in the 'options' create two color ranges (allowing for custom input)

    ...
        colorPreSet:
        {
          type: 'string',
          display: 'select',
          label: 'Color Range',
          section: 'Data',
          values: [{'Custom': 'c'},
          {'Tomato to Steel Blue': '#F16358,#DF645F,#CD6566,#BB666D,#A96774,#97687B,#856982,#736A89,#616B90,#4F6C97,#3D6D9E'},
          {'Pink to Black': '#170108, #300211, #49031A, #620423, #79052B, #910734, #AA083D, #C30946, #DA0A4E, #F30B57, #F52368, #F63378, #F63C79, #F75389, #F86C9A, #F985AB, #FB9DBC, #FCB4CC, #FDCDDD, #FEE6EE'},
          {'Green to Red': '#7FCDAE, #7ED09C, #7DD389, #85D67C, #9AD97B, #B1DB7A, #CADF79, #E2DF78, #E5C877, #E7AF75, #EB9474, #EE7772'},
          {'White to Green': '#ffffe5,#f7fcb9 ,#d9f0a3,#addd8e,#78c679,#41ab5d,#238443,#006837,#004529'}],
           default: 'c',
          order: 1
        },
        colorRange: {
          type: 'array',
          label: 'Custom Color Ranges',
          section: 'Data',
          order: 2,
          placeholder: '#fff, red, etc...'
        },
    ...
In the *update* function:

    ...
        if (settings.colorPreSet  == 'c') {
          var colorSettings =  settings.colorRange || ['white','green','red']; // put a default in
        } else {
          var colorSettings =  settings.colorPreSet.split(",");
        };
    ...
