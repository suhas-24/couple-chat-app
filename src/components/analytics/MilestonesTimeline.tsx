import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  Heart, 
  Gift, 
  Star, 
  Sparkles, 
  Award,
  MessageCircle,
  Plane,
  GraduationCap,
  Home,
  Ring
} from 'lucide-react';

interface Milestone {
  date: string;
  type: string;
  description: string;
  significance: 'low' | 'medium' | 'high';
  messageCount?: number;
  participants?: string[];
}

interface MilestonesTimelineProps {
  milestones: Milestone[];
  theme: any;
}

const getMilestoneIcon = (type: string) => {
  const iconMap: Record<string, React.ReactNode> = {
    anniversary: <Heart className="h-5 w-5" />,
    birthday: <Gift className="h-5 w-5" />,
    vacation: <Plane className="h-5 w-5" />,
    achievement: <GraduationCap className="h-5 w-5" />,
    firstTime: <Star className="h-5 w-5" />,
    iLoveYou: <Heart className="h-5 w-5" />,
    proposal: <Ring className="h-5 w-5" />,
    moving: <Home className="h-5 w-5" />,
    message_count: <MessageCircle className="h-5 w-5" />,
    conversation_streak: <Award className="h-5 w-5" />,
    first_message: <Sparkles className="h-5 w-5" />
  };
  
  return iconMap[type] || <Calendar className="h-5 w-5" />;
};

const getMilestoneColor = (significance: string, type: string) => {
  if (type === 'proposal' || type === 'iLoveYou') {
    return {
      bg: 'bg-red-100',
      border: 'border-red-300',
      icon: 'text-red-500',
      accent: 'bg-red-500'
    };
  }
  
  switch (significance) {
    case 'high':
      return {
        bg: 'bg-pink-100',
        border: 'border-pink-300',
        icon: 'text-pink-500',
        accent: 'bg-pink-500'
      };
    case 'medium':
      return {
        bg: 'bg-purple-100',
        border: 'border-purple-300',
        icon: 'text-purple-500',
        accent: 'bg-purple-500'
      };
    default:
      return {
        bg: 'bg-blue-100',
        border: 'border-blue-300',
        icon: 'text-blue-500',
        accent: 'bg-blue-500'
      };
  }
};

const formatMilestoneDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  const formattedDate = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  if (diffDays === 0) {
    return { formatted: formattedDate, relative: 'Today' };
  } else if (diffDays === 1) {
    return { formatted: formattedDate, relative: date < now ? 'Yesterday' : 'Tomorrow' };
  } else if (diffDays < 7) {
    return { formatted: formattedDate, relative: `${diffDays} days ago` };
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return { formatted: formattedDate, relative: `${weeks} week${weeks > 1 ? 's' : ''} ago` };
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return { formatted: formattedDate, relative: `${months} month${months > 1 ? 's' : ''} ago` };
  } else {
    const years = Math.floor(diffDays / 365);
    return { formatted: formattedDate, relative: `${years} year${years > 1 ? 's' : ''} ago` };
  }
};

export default function MilestonesTimeline({ milestones, theme }: MilestonesTimelineProps) {
  if (!milestones || milestones.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600">No Milestones Yet</h3>
            <p className="text-gray-500">Keep chatting to create beautiful memories!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort milestones by date (most recent first)
  const sortedMilestones = [...milestones].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            Your Love Story Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-pink-300 via-purple-300 to-blue-300"></div>
            
            <div className="space-y-6">
              {sortedMilestones.map((milestone, index) => {
                const colors = getMilestoneColor(milestone.significance, milestone.type);
                const dateInfo = formatMilestoneDate(milestone.date);
                
                return (
                  <motion.div
                    key={`${milestone.date}-${milestone.type}`}
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.5 }}
                    className="relative flex items-start gap-4"
                  >
                    {/* Timeline dot */}
                    <div className={`relative z-10 flex items-center justify-center w-16 h-16 rounded-full ${colors.bg} ${colors.border} border-2`}>
                      <div className={`${colors.icon}`}>
                        {getMilestoneIcon(milestone.type)}
                      </div>
                      
                      {/* Significance indicator */}
                      {milestone.significance === 'high' && (
                        <div className={`absolute -top-1 -right-1 w-4 h-4 ${colors.accent} rounded-full flex items-center justify-center`}>
                          <Star className="h-2 w-2 text-white" />
                        </div>
                      )}
                    </div>
                    
                    {/* Milestone content */}
                    <div className="flex-1 min-w-0">
                      <div className={`p-4 rounded-lg ${colors.bg} ${colors.border} border`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-800 mb-1">
                              {milestone.description}
                            </h3>
                            
                            <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                              <span className="font-medium">{dateInfo.formatted}</span>
                              <span className="text-gray-500">({dateInfo.relative})</span>
                            </div>
                            
                            {milestone.messageCount && (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <MessageCircle className="h-3 w-3" />
                                <span>{milestone.messageCount} messages that day</span>
                              </div>
                            )}
                            
                            {milestone.participants && milestone.participants.length > 0 && (
                              <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                                <span>With: {milestone.participants.join(', ')}</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Significance badge */}
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                            milestone.significance === 'high' ? 'bg-red-100 text-red-700' :
                            milestone.significance === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {milestone.significance}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Milestone Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Milestone Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-pink-50 to-red-50 rounded-lg">
              <div className="text-2xl font-bold text-pink-600">
                {milestones.filter(m => m.significance === 'high').length}
              </div>
              <div className="text-sm text-gray-600">High Significance</div>
            </div>
            
            <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {milestones.filter(m => m.significance === 'medium').length}
              </div>
              <div className="text-sm text-gray-600">Medium Significance</div>
            </div>
            
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {milestones.length}
              </div>
              <div className="text-sm text-gray-600">Total Milestones</div>
            </div>
          </div>
          
          {/* Milestone types breakdown */}
          <div className="mt-6">
            <h4 className="font-semibold text-gray-800 mb-3">Milestone Types</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(
                milestones.reduce((acc, milestone) => {
                  acc[milestone.type] = (acc[milestone.type] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)
              ).map(([type, count]) => (
                <div key={type} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <div className="text-gray-600">
                    {getMilestoneIcon(type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 capitalize">
                      {type.replace(/([A-Z])/g, ' $1').trim()}
                    </div>
                    <div className="text-xs text-gray-600">{count}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}