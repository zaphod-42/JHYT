(function($) {
    angular.module("JHYT", [])
        .run(function (YtClient) {
            gapiRady = function() {
                gapi.auth.init(function() {
                    window.setTimeout(function(){
                        YtClient.auth();
                    }, 1);
                });
            };
            var gabi_script = document.createElement('script')
            gabi_script.src = "https://apis.google.com/js/client.js?onload=gapiRady";
            document.getElementsByTagName('head')[0].appendChild(gabi_script);
            
            var yt_script = document.createElement('script')
            yt_script.src = "http://www.youtube.com/iframe_api";
            document.getElementsByTagName('head')[0].appendChild(yt_script);
        })
        .service('YtClient',function($http){
            
            this.address = '';
            this.coords = '';
            this.Videos = {};
            
            this.FavoriteList = false;
            this.Favorites = {};
            this.loaded = false;
            
            this.auth = function(imm){
                if(typeof imm == 'undefined') imm=true;
                var client = this;
                gapi.auth.authorize({
                    client_id: '1001826233156-jtruiibrjjd6etbcvnnri28b4mg08k3n.apps.googleusercontent.com',
                    scope: [
                        'https://www.googleapis.com/auth/youtube',
                        'https://www.googleapis.com/auth/youtube.force-ssl',
                    ],
                    key: 'AIzaSyBbtrJLZGkdJ4ZEEg-P5-ZLlUvL8TUbyWc',
                    immediate: imm
                }, function(authResult){
                    if (authResult && !authResult.error) {
                        gapi.client.load('youtube', 'v3', function() {
                            client.loaded = true;
                            //client.search(vals, $scope);
                        });
                    }else{
                        console.log(authResult);
                    }
                });
                return;
            }
            
            this.search = function(vals, $scope){
                
                if(this.loaded === false){
                    this.auth(false);
                    return;
                }
                
                if(vals.location != '' && vals.location != this.address){
                    this.locate(vals, $scope);
                }
                else{
                    var client = this;
                    var search = {
                        q: vals.searchString,
                        type: 'video',
                        part: 'snippet',
                        order: vals.order,
                    }
                    if(vals.location!=''){
                        search.location = this.coords;
                        search.locationRadius = vals.locationRadius+vals.locationUnit;
                    }
                    gapi.client.youtube.search.list(search)
                      .execute(function(response) {
                        $scope.results = [];
                        for(var i in response.result.items){
                            var videoID = response.result.items[i].id.videoId;
                            client.Videos[videoID] = response.result.items[i];
                            $scope.results.push(response.result.items[i]);
                        }
                        $scope.$apply();
                    });
                }
                return;
            };
            
            this.locate = function(vals, $scope){
                var client = this;
                $http.get('https://maps.googleapis.com/maps/api/geocode/json', {params:{address: vals.location, key: this.opts.key}})
                    .success(function(r){
                        vals.location = client.address = r.results[0].formatted_address;
                        client.coords = r.results[0].geometry.location.lat+','+r.results[0].geometry.location.lng;
                        //$scope.$apply();
                        client.search(vals, $scope);
                    });
                return '';
            };
            return this;
            
        })
        .directive("compile", function($compile){
            return {
                restrict: 'A',
                link: function(scope, element, attr){
                    attr.$observe("compile", function(str){
                        var compiled = $compile("<div>"+str+"</div>")(scope);
                        $(element).replaceWith(compiled);
                    })
                }
            }
        })
        .controller("YtWrapper", function($scope){
            
        })
        .directive("sidebarTabset", function($compile) {
            return {
                restrict : 'E',
                templateUrl : 'tabset.html',
                controller : function($scope, $compile, $http) {
                    this._current = 0;
                    this.current = function(i) {
                        if (i != null)
                            this._current = i;
                        return this._current;
                    };
                    this.tabs = ['Search', 'Favorite'];
                    this.panes = [{
                        contents : "<search-form></search-form><hr/><search-results></search-results>"
                    }, {
                        contents : "Favorite Pane"
                    }];
                },
                controllerAs : 'tabset',
            };
        }).
        directive("searchForm", function(YtClient) {
            return {
                restrict : 'E',
                templateUrl : 'search-form.html',
                controller : function($scope, $compile, $http) {
                    this.searchString = '';
                    this.location = '';
                    this.locationRadius = '1';
                    this.locationUnit = 'mi';
                    this.order = 'relevance';
                    $scope.results = [];
                    this.submit = function() {
                        YtClient.search(this, $scope);
                        //$scope.$apply();
                    };
                },
                controllerAs : 'YTCtrl',
                
            }
        })
        .directive("searchResults", function(YtClient){
            return {
                restrict : 'E',
                templateUrl: 'search-results.html',
                controller : function($scope, $compile, $http){
                    this.watch = function(video){
                        $scope.watchVideo(video);
                    }
                    //console.log(this.results);
                },
                controllerAs : 'search'
            }
        })
        .directive("videoPlayer", function(YtClient){
            return {
                restrict : 'E',
                templateUrl: 'video.html',
                controller: function($scope, $attrs){
                    var cntrl = this;
                    $scope.watchVideo = function(video){
                        $scope.playing = video;
                        cntrl.loadComments(function(){
                            cntrl.loadStats(function(){
                                cntrl.loadVideo(function(){
                                    $scope.playing.loaded = true;
                                    $scope.$apply();
                                });
                            });
                        })
                        return true;
                    };
                    this.loadComments = function(cb){
                        gapi.client.youtube.commentThreads.list({
                            part: 'snippet',
                            videoId: $scope.playing.id.videoId,
                        }).execute(function(response){
                            $scope.playing.comments=[];
                            for(var i in response.result.items){
                                $scope.playing.comments.push(response.result.items[i].snippet.topLevelComment.snippet);
                            }
                            cb();
                        });
                        return true;
                    };
                    
                    this.loadStats = function(cb){
                        gapi.client.youtube.videos.list({
                            id: $scope.playing.id.videoId,
                            part: 'statistics'
                        }).execute(function(response){
                            $scope.playing.statistics = response.result.items[0].statistics;
                            cb();
                        });
                        return true;
                    };
                    
                    this.loadVideo = function(cb){
                        $('#mainplayer').before('<div id="mainplayer"></div>').remove();
                        $scope.player = new YT.Player('mainplayer', {
                            height: '390',
                            width: '640',
                            videoId: $scope.playing.id.videoId,
                            playerVars: { 'autoplay': 1, 'controls': 0 },
                            events: {
                                'onReady': function(e){
                                    cb();
                                },
                            }
                        });
                    }
                },
            }
        });
})(jQuery);

function digIt(a, path){
    while((a = a[path.shift()]) && path.length>0);
    return a;
}



