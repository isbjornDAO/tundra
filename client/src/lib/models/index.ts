// Central model registration to prevent MissingSchemaError
// Import all models to ensure they are registered with Mongoose
import { User } from './User';
import { Clan } from './Clan';
import { Tournament } from './Tournament';
import { Bracket } from './Bracket';
import { Match } from './Match';
import { TournamentRegistration } from './TournamentRegistration';
import { Message } from './Message';
import { ClanRequest } from './ClanRequest';
import { AdminConfig } from './AdminConfig';

// Force registration of all models
export function initializeModels() {
  // These imports ensure models are registered
  const _User = User;
  const _Clan = Clan;
  const _Tournament = Tournament;
  const _Bracket = Bracket;
  const _Match = Match;
  const _TournamentRegistration = TournamentRegistration;
  const _Message = Message;
  const _ClanRequest = ClanRequest;
  const _AdminConfig = AdminConfig;
  
  return {
    User: _User,
    Clan: _Clan,
    Tournament: _Tournament,
    Bracket: _Bracket,
    Match: _Match,
    TournamentRegistration: _TournamentRegistration,
    Message: _Message,
    ClanRequest: _ClanRequest,
    AdminConfig: _AdminConfig
  };
}

// Export models for direct use
export { User, Clan, Tournament, Bracket, Match, TournamentRegistration, Message, ClanRequest, AdminConfig };