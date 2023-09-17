const response = require("../helpers/response");
const Residence = require("../models/Residence");
const User = require("../models/User");

//Add residence
const addResidence = async (req, res) => {
    try {
        const { 
            photo, 
            capacity, 
            beds, 
            baths, 
            address, 
            city, 
            municipality, 
            quirtier, 
            aboutResidence, 
            hourlyAmount, 
            dailyAmount, 
            amenities, 
            ownerName, 
            aboutOwner 
        } = req.body;

        const checkHost = await User.findById(req.body.userId);

        if (!checkHost) {
            return res.status(404).json(response({status: 'Error', statusCode: '404', message: 'User not found'}));
        };

        if (checkHost.role === 'host') {
            const residence = new Residence({
                photo, 
                capacity, 
                beds, 
                baths, 
                address, 
                city,
                municipality, 
                quirtier, 
                aboutResidence, 
                hourlyAmount,
                dailyAmount, 
                amenities, 
                ownerName, 
                aboutOwner,
                hostId: req.body.userId,
            });
    
            await residence.save();
    
            return res.status(201).json(response({status: 'Created', statusCode: '201', type: 'residence', message: 'Residence added successfully.', data: residence}));
        }else{
            return res.status(401).json(response({status: 'Error', statusCode: '401', message: 'You are Not authorize to add residence'}));
        }

    } catch (error) {
        console.error(error);
        return res.status(500).json(response({status: 'Error', statusCode: '500', message: 'Error added residence'}));
    }
};

//All residences
const allResidences = async (req, res) => {
    try {
      const checkUser = await User.findOne({_id: req.body.userId});
  
      const residenceTypes = req.params.filter;
      const search = req.query.search || '';
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const searchRegExp = new RegExp('.*' + search + '.*', 'i');
      const filter = {
        $or: [
          { address: { $regex: searchRegExp } },
          { city: { $regex: searchRegExp } },
        //   { beds: { $regex: searchRegExp } },
          { municipality: { $regex: searchRegExp } },
        ],
      };
  
      if (!checkUser) {
        return res.status(404).json(
          response({
            status: 'Error',
            statusCode: '404',
            message: 'User not found',
          })
        );
      }
  
      let residences = [];
      let count = 0;
  
      if (checkUser.role === 'user' || checkUser.role === 'admin') {
        residences = await Residence.find(filter)
          .limit(limit)
          .skip((page - 1) * limit);
        count = await Residence.countDocuments(filter);
      } else if (checkUser.role === 'host') {
        residences = await Residence.find({
          hostId: req.body.userId,
          ...filter, // Apply the same filtering criteria as for user and admin
        })
          .limit(limit)
          .skip((page - 1) * limit);
        count = await Residence.countDocuments({
          hostId: req.body.userId,
          ...filter, // Apply the same filtering criteria as for user and admin
        });
      }
  
      return res.status(200).json(
        response({
          status: 'OK',
          statusCode: '200',
          type: 'residence',
          message: 'Residences retrieved successfully',
          data: {
            residences,
            pagination: {
                totalDocuments: count,
                totalPage: Math.ceil(count / limit),
                currentPage: page,
                previousPage: page > 1 ? page - 1 : null,
                nextPage: page < Math.ceil(count / limit) ? page + 1 : null,
              },
          },
        })
      );
    } catch (error) {
      console.log(error);
      return res.status(500).json(
        response({
          status: 'Error',
          statusCode: '500',
          message: 'Error getting residences',
        })
      );
    }
};




module.exports = { addResidence, allResidences };