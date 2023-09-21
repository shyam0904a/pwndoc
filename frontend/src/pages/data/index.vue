<template>
<div>
    <q-drawer side="left" :value="true">
        <q-list class="topbar-background rounded-borders">
            <q-item-label header>{{$t('handleCustomData')}}</q-item-label>
        
            <q-separator />
        
            <q-item to='/data/collaborators'>
                <q-item-section avatar>
                    <q-icon name="fa fa-users" />
                </q-item-section>
                <q-item-section>{{$t('collaborators')}}</q-item-section>
            </q-item>
            <q-item to='/data/companies'>
                <q-item-section avatar>
                    <q-icon name="fa fa-building" />
                </q-item-section>
                <q-item-section>{{$t('companies')}}</q-item-section>
            </q-item>
            <q-item to='/data/clients'>
                <q-item-section avatar>
                    <q-icon name="fa fa-user-tie" />
                </q-item-section>
                <q-item-section>{{$t('clients')}}</q-item-section>
            </q-item>
            <q-item to='/data/templates'>
                <q-item-section avatar>
                    <q-icon name="fa fa-file-word" />
                </q-item-section>
                <q-item-section>{{$t('templates')}}</q-item-section>
            </q-item>

            <q-separator spaced />

            <q-item to='/data/custom'>
                <q-item-section avatar>
                    <q-icon name="fa fa-table" />
                </q-item-section>
                <q-item-section>{{$t('customData')}}</q-item-section>
            </q-item>
            <q-item to='/data/dump'>
                <q-item-section avatar>
                    <q-icon name="fa fa-archive" />
                </q-item-section>
                <q-item-section>{{$t('import')}} / {{$t('export')}}</q-item-section>
            </q-item>
        </q-list>
    </q-drawer>
    <router-view />     
</div>
</template>

<script>
import Breadcrumb from 'components/breadcrumb'
import UserService from '@/services/user'

export default {
    data: () => {
        return {
            UserService: UserService
        }
    },

    components: {
        Breadcrumb
    }
}
</script>

<style lang="stylus">
/*.topbar-background-drawer>.q-list>.q-link:hover:after,
.topbar-background>.q-router-link--active:after,
.topbar-background>.q-item--active:after {
    --color: #77C84E;
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 5px;
    height: 100%;
    background: var(--color);
}*/

.topbar-background .q-router-link--active {
    background-color: $primary;
    opacity: 0.9;
    background: linear-gradient(316deg, #310e68 0%, #5f0f40 74%);
	color: white!important;
    border-radius 20px;
}

</style>

