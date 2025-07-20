const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Country mapping (same as in types/countries.ts)
const COUNTRY_NAME_TO_CODE = {
  'Afghanistan': 'AF',
  'Albania': 'AL',
  'Algeria': 'DZ',
  'Argentina': 'AR',
  'Armenia': 'AM',
  'Australia': 'AU',
  'Austria': 'AT',
  'Azerbaijan': 'AZ',
  'Bahrain': 'BH',
  'Bangladesh': 'BD',
  'Belarus': 'BY',
  'Belgium': 'BE',
  'Bolivia': 'BO',
  'Bosnia and Herzegovina': 'BA',
  'Brazil': 'BR',
  'Bulgaria': 'BG',
  'Cambodia': 'KH',
  'Canada': 'CA',
  'Chile': 'CL',
  'China': 'CN',
  'Colombia': 'CO',
  'Croatia': 'HR',
  'Czech Republic': 'CZ',
  'Denmark': 'DK',
  'Ecuador': 'EC',
  'Egypt': 'EG',
  'Estonia': 'EE',
  'Finland': 'FI',
  'France': 'FR',
  'Georgia': 'GE',
  'Germany': 'DE',
  'Ghana': 'GH',
  'Greece': 'GR',
  'Hungary': 'HU',
  'Iceland': 'IS',
  'India': 'IN',
  'Indonesia': 'ID',
  'Iran': 'IR',
  'Iraq': 'IQ',
  'Ireland': 'IE',
  'Israel': 'IL',
  'Italy': 'IT',
  'Japan': 'JP',
  'Jordan': 'JO',
  'Kazakhstan': 'KZ',
  'Kenya': 'KE',
  'Kuwait': 'KW',
  'Latvia': 'LV',
  'Lebanon': 'LB',
  'Lithuania': 'LT',
  'Luxembourg': 'LU',
  'Malaysia': 'MY',
  'Mexico': 'MX',
  'Morocco': 'MA',
  'Netherlands': 'NL',
  'New Zealand': 'NZ',
  'Nigeria': 'NG',
  'Norway': 'NO',
  'Pakistan': 'PK',
  'Peru': 'PE',
  'Philippines': 'PH',
  'Poland': 'PL',
  'Portugal': 'PT',
  'Qatar': 'QA',
  'Romania': 'RO',
  'Russia': 'RU',
  'Saudi Arabia': 'SA',
  'Serbia': 'RS',
  'Singapore': 'SG',
  'Slovakia': 'SK',
  'Slovenia': 'SI',
  'South Africa': 'ZA',
  'South Korea': 'KR',
  'Spain': 'ES',
  'Sweden': 'SE',
  'Switzerland': 'CH',
  'Thailand': 'TH',
  'Turkey': 'TR',
  'Ukraine': 'UA',
  'United Arab Emirates': 'AE',
  'United Kingdom': 'GB',
  'United States': 'US',
  'Uruguay': 'UY',
  'Venezuela': 'VE',
  'Vietnam': 'VN'
};

// Clan schema (simplified for migration)
const clanSchema = new mongoose.Schema({
  name: String,
  tag: String,
  country: String,
  // other fields...
}, { collection: 'clans' });

const Clan = mongoose.model('Clan', clanSchema);

async function migrateClanCountryCodes() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all clans
    const clans = await Clan.find({});
    console.log(`Found ${clans.length} clans to migrate`);

    let migrated = 0;
    let alreadyCode = 0;
    let unknown = 0;

    for (const clan of clans) {
      const currentCountry = clan.country;
      
      if (!currentCountry) {
        console.log(`Clan ${clan.name} has no country set`);
        continue;
      }

      // If it's already a 2-letter code, leave it
      if (currentCountry.length === 2) {
        alreadyCode++;
        continue;
      }

      // Try to convert country name to code
      const countryCode = COUNTRY_NAME_TO_CODE[currentCountry];
      
      if (countryCode) {
        await Clan.updateOne(
          { _id: clan._id },
          { country: countryCode }
        );
        console.log(`✅ Migrated clan ${clan.name}: "${currentCountry}" → "${countryCode}"`);
        migrated++;
      } else {
        console.log(`❌ Unknown country for clan ${clan.name}: "${currentCountry}"`);
        unknown++;
      }
    }

    console.log('\n=== Clan Migration Summary ===');
    console.log(`✅ Migrated: ${migrated} clans`);
    console.log(`⏭️  Already codes: ${alreadyCode} clans`);
    console.log(`❌ Unknown countries: ${unknown} clans`);
    console.log(`📊 Total processed: ${clans.length} clans`);

  } catch (error) {
    console.error('Clan migration error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the migration
migrateClanCountryCodes();