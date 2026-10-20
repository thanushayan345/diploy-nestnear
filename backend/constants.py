"""Fixed lists of values and verified Sri Lankan university coordinates."""

ROLES = ("student", "owner")

ACCOMMODATION_TYPES = ("Room", "Boarding House", "Annex")

GENDER_PREFERENCES = ("Any", "Male", "Female")

BOOKING_STATUSES = ("Pending", "Accepted", "Rejected", "Cancelled")

FACILITIES = (
    "Wi-Fi",
    "Attached Bathroom",
    "Furniture",
    "Study Table",
    "Kitchen Access",
    "Meals Provided",
    "Air Conditioning",
    "Fan",
    "Water Included",
    "Electricity Included",
    "Laundry",
    "Parking",
    "CCTV",
    "Hot Water",
)

DISTRICTS = (
    "Ampara", "Anuradhapura", "Badulla", "Batticaloa", "Colombo", "Galle",
    "Gampaha", "Hambantota", "Jaffna", "Kalutara", "Kandy", "Kegalle",
    "Kilinochchi", "Kurunegala", "Mannar", "Matale", "Matara", "Monaragala",
    "Mullaitivu", "Nuwara Eliya", "Polonnaruwa", "Puttalam", "Ratnapura",
    "Trincomalee", "Vavuniya",
)

# Verified coordinates for major Sri Lankan universities
UNIVERSITY_DATA = (
    {
        "name": "University of Colombo",
        "district": "Colombo",
        "town": "Colombo 07",
        "latitude": 6.9000,
        "longitude": 79.8588,
    },
    {
        "name": "University of Peradeniya",
        "district": "Kandy",
        "town": "Peradeniya",
        "latitude": 7.2549,
        "longitude": 80.5974,
    },
    {
        "name": "University of Sri Jayewardenepura",
        "district": "Colombo",
        "town": "Nugegoda",
        "latitude": 6.8528,
        "longitude": 79.9036,
    },
    {
        "name": "University of Kelaniya",
        "district": "Gampaha",
        "town": "Dalugama",
        "latitude": 6.9739,
        "longitude": 79.9157,
    },
    {
        "name": "University of Moratuwa",
        "district": "Colombo",
        "town": "Katubedda",
        "latitude": 6.7951,
        "longitude": 79.9009,
    },
    {
        "name": "University of Jaffna",
        "district": "Jaffna",
        "town": "Thirunelvely",
        "latitude": 9.6848,
        "longitude": 80.0220,
    },
    {
        "name": "University of Ruhuna",
        "district": "Matara",
        "town": "Wellamadama",
        "latitude": 5.9381,
        "longitude": 80.5761,
    },
    {
        "name": "Eastern University, Sri Lanka",
        "district": "Batticaloa",
        "town": "Vantharumoolai",
        "latitude": 7.7944,
        "longitude": 81.5790,
    },
    {
        "name": "South Eastern University of Sri Lanka",
        "district": "Ampara",
        "town": "Oluvil",
        "latitude": 7.2970,
        "longitude": 81.8500,
    },
    {
        "name": "Rajarata University of Sri Lanka",
        "district": "Anuradhapura",
        "town": "Mihintale",
        "latitude": 8.3565,
        "longitude": 80.5035,
    },
    {
        "name": "Sabaragamuwa University of Sri Lanka",
        "district": "Ratnapura",
        "town": "Belihuloya",
        "latitude": 6.7146,
        "longitude": 80.7872,
    },
    {
        "name": "Wayamba University of Sri Lanka",
        "district": "Kurunegala",
        "town": "Kuliyapitiya",
        "latitude": 7.3225,
        "longitude": 79.9881,
    },
    {
        "name": "Uva Wellassa University",
        "district": "Badulla",
        "town": "Badulla",
        "latitude": 6.9819,
        "longitude": 81.0763,
    },
    {
        "name": "University of Vavuniya",
        "district": "Vavuniya",
        "town": "Pampaimadu",
        "latitude": 8.7589,
        "longitude": 80.4103,
    },
    {
        "name": "Gampaha Wickramarachchi University",
        "district": "Gampaha",
        "town": "Yakkala",
        "latitude": 7.0917,
        "longitude": 80.0144,
    },
    {
        "name": "University of the Visual and Performing Arts",
        "district": "Colombo",
        "town": "Colombo 07",
        "latitude": 6.9106,
        "longitude": 79.8633,
    },
    {
        "name": "Open University of Sri Lanka",
        "district": "Colombo",
        "town": "Nawala",
        "latitude": 6.8831,
        "longitude": 79.8867,
    },
    {
        "name": "General Sir John Kotelawala Defence University",
        "district": "Colombo",
        "town": "Ratmalana",
        "latitude": 6.8194,
        "longitude": 79.8903,
    },
    {
        "name": "SLIIT",
        "district": "Colombo",
        "town": "Malabe",
        "latitude": 6.9147,
        "longitude": 79.9729,
    },
    {
        "name": "NSBM Green University",
        "district": "Colombo",
        "town": "Homagama",
        "latitude": 6.8213,
        "longitude": 80.0416,
    },
)

UNIVERSITIES = tuple(u["name"] for u in UNIVERSITY_DATA)

UNIVERSITY_BY_NAME = {u["name"]: u for u in UNIVERSITY_DATA}
