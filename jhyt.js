(function($){
    var client;
    
    $(document).ready(function(){
        $('.favorites-link, .search-link').click(function(){
            $('#sidebar').children().hide();
            $('#'+this.href.split('#')[1]).show();
        });
        $('#favorite-this').click(function(){
            var videoId = $(this).attr('data-video');
            $(this).attr('disabled', true);
            if($(this).attr('data-action')=='add'){
                gapi.client.youtube.playlistItems.insert({
                    part: 'snippet',
                    resource: {
                        snippet: {
                            playlistId: client.FavoriteList,
                            resourceId: { videoId: videoId, kind: 'youtube#video' }
                        }
                    }
                }).execute(function(response){
                    if(response.result.id){
                        client.Favorites[videoId]=response.result.id;
                        client.addVideo(videoID, $('#favorites'));
                        $('#favorite-this').attr('disabled', false).text('Unavorite This').attr('data-action', 'remove');
                    }
                });
                
            }else{
                gapi.client.youtube.playlistItems.delete({
                    id: client.Favorites[videoId],
                }).execute(function(){
                    client.Favorites[videoId]=false;
                    $('#favorites').find('[data-video='+videoId+']').remove();
                    $('#favorite-this').attr('disabled', false).text('Favorite This').attr('data-action', 'add');
                });
                
            }
        });
    });
    
    googleApiClientReady = function() {
        gapi.auth.init(function() {
            window.setTimeout(function(){
                client = new JHYT();
                client.auth();
            }, 1);
        });
    }
    
    JHYT = function(){
        this.Key = 'AIzaSyBbtrJLZGkdJ4ZEEg-P5-ZLlUvL8TUbyWc';
        this.ClientID = '1001826233156-jtruiibrjjd6etbcvnnri28b4mg08k3n.apps.googleusercontent.com';
        this.Scope = [
            'https://www.googleapis.com/auth/youtube',
            'https://www.googleapis.com/auth/youtube.force-ssl',
            //'https://www.googleapis.com/auth/youtubepartner'
        ];
        this.Address = '';
        this.Location = '';
        this.Videos = {};
        
        this.FavoriteList = false;
        this.Favorites = {};
    }
    
    JHYT.prototype.auth = function(imm){
        if(typeof imm == 'undefined') imm=true;
        gapi.auth.authorize({
                client_id: this.ClientID,
                scope: this.Scope,
                key: this.Key,
                immediate: imm
            }, function(a){client.finishAuth(a);});
    }
    
    JHYT.prototype.finishAuth = function(authResult){
        if (authResult && !authResult.error) {
            $('body').removeClass('not-logged-in').addClass('logged-in');
            $('#search').click(function(){
               client.search(); 
            });
            gapi.client.load('youtube', 'v3', function() {
                client.getPlaylists();
            });
          } else {
            $('#login').click(function() {
              client.auth(false);
            });
          }
        
    }
    
    JHYT.prototype.search = function(){
        if($('#location').val()!='' && $('#location').val()!==this.Address){
            $.get('https://maps.googleapis.com/maps/api/geocode/json?address='+$('#location').val()+'&key='+this.Key, function(r){
                client.Address = r.results[0].formatted_address;
                client.Location = r.results[0].geometry.location.lat+','+r.results[0].geometry.location.lng;
                $('#location').val(client.Address);
                client.search();
            });
        }else{
            var search = {
                q: $('#search_box').val(),
                type: 'video',
                part: 'snippet',
                order: $('#search_order').val(),
            }
            if(this.Location!=''){
                search.location = this.Location;
                search.locationRaduis = $('#radius').val()+$('#radius_unit').val();
            }
            gapi.client.youtube.search.list(search)
              .execute(function(response) {
                $('#search-container').html('');
                for(var i in response.result.items){
                    var videoID = response.result.items[i].id.videoId;
                    client.Videos[videoID] = response.result.items[i];
                    client.addVideo(videoID, $('#search-container'));
                }
            });
        }
    }
    JHYT.prototype.addVideo = function(videoID, wrapper){
        var item = client.Videos[videoID].snippet;
        $('<div></div>')
            .attr('data-video', videoID)
            .click(function(){
                client.watch($(this).attr('data-video'));
            })
            .append('<h4>'+item.title+'</h4><br>')
            .append('<img src="'+item.thumbnails.default.url+'" style="width:200px;" />')
            .appendTo(wrapper);
    }
    JHYT.prototype.watch = function(videoId){
        gapi.client.youtube.videos.list({
            id: videoId,
            part: 'statistics'
        }).execute(function(response){
            var item = response.result.items[0];
            
            client.Videos[videoId].statistics = item.statistics;
            
            $('#player').after('<div id="player"></div>').remove();
            JHYT.player = new YT.Player('player', {
                  height: '390',
                  width: '640',
                  videoId: videoId,
                  events: {
                    'onReady': function(e){client.loadPlayer(e, videoId);},
                  }
            });
        });
    }
    
    JHYT.prototype.getPlaylists = function(){
        gapi.client.youtube.playlists.list({
            part: 'snippet',
            mine: true,
            maxResults: 50
        }).execute(function(response){
            for(var i in response.result.items){
                var list = response.result.items[i];
                if(list.snippet.title == 'JH Favorites'){
                    client.FavoriteList = list.id;
                    gapi.client.youtube.playlistItems.list({
                       part: 'snippet',
                       playlistId: list.id 
                    }).execute(function(response){
                        for(var i in response.result.items){
                            var item = response.result.items[i].snippet;
                            var videoID = response.result.items[i].snippet.resourceId.videoId;
                            client.Favorites[videoID] = response.result.items[i].id;
                            client.Videos[videoID] = response.result.items[i];
                            
                            client.addVideo(videoID, $('#favorites'));
                        }
                    });
                }
            }
            if(!client.FavoriteList){
                gapi.client.youtube.playlists.insert({
                    part: 'snippet,status',
                    resource: {
                        snippet: {
                            title: 'JH Favorites',
                            description: 'A private playlist created with the YouTube API for saving favorite videos from this search page'
                        },
                        status: {
                            privacyStatus: 'private'
                        }
                    }
                }).execute(function(response) {
                    var result = response.result;
                    if (result) {
                        playlistId = result.id;
                    } else {
                        alert('we could not create your favorites list!');
                    }
                });
            }
        });
    }
    
    JHYT.prototype.loadPlayer = function(e, videoId){
        
        $('#title').html(client.Videos[videoId].snippet.title);
        
        $('#description .text').html(client.Videos[videoId].snippet.description);
        $('#channel .text').html(client.Videos[videoId].snippet.channelTitle);
        
        if(client.Videos[videoId].statistics.likeCount<1){
            client.Videos[videoId].statistics.likeCount = 'none';
        }
        if(client.Videos[videoId].statistics.dislikeCount<1){
            client.Videos[videoId].statistics.dislikeCount = 'none';
        }
        $('#likes .text').html(client.Videos[videoId].statistics.likeCount);
        $('#dislikes .text').html(client.Videos[videoId].statistics.dislikeCount);
        
        $('#comments').hide();
        
        if(client.Videos[videoId].statistics.commentCount>0){
            this.loadComments(videoId);
        }
        
        if(typeof client.Favorites[videoId] == 'undefined' || client.Favorites[videoId] == false){
            $('#favorite-this').text('Favorite This').attr('data-action', 'add');
        }else{
            $('#favorite-this').text('Unfavorite This').attr('data-action', 'remove');
        }
        $('#favorite-this').attr('data-video', videoId);
        
        e.target.playVideo();
        
        $('#content').show();
    }
    
    JHYT.prototype.loadComments = function(videoId){
        gapi.client.youtube.commentThreads.list({
            part: 'snippet',
            videoId: videoId 
        }).execute(function(response){
            var items = response.result.items;
            var date = new Date();
            $('#comments').html('');
            for(var i in items){
                var comment = items[i].snippet.topLevelComment.snippet;
                date.setTime(Date.parse(comment.publishedAt));
                var commentEl = $('<div class="comment"></div>').append('<div>'+comment.authorDisplayName+' - '+(date.getMonth()+1)+'/'+date.getDate()+'/'+date.getFullYear()+'</div>').append('<div>'+comment.textDisplay+'</div>');
                $('#comments').append(commentEl);
            }
            $('#comments').fadeIn();
        });
    }
})(jQuery)
